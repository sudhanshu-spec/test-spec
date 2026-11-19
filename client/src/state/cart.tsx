/**
 * Cart State Module
 *
 * The cart of one visit: the lines a shopper chose, the quantity rules that keep every line inside
 * what the order endpoint accepts, and the two display totals the header badge and the cart screen
 * read. Holding it is the whole module's job.
 *
 * The cart lives in React state and nowhere else (rule R-8): no storage, no cookie, no server round
 * trip, no persistence of an abandoned cart. It is dropped when the session ends, whether the shopper
 * logged out or a 401 ended it, because `session.tsx` reports both as 'anonymous'.
 *
 * Money here is a display copy, never authority (rule R-3): `price_cents` on a line is the price the
 * item carried when it was added, and `totalCents` is an integer count of cents for display only. No
 * amount is posted and no request body is built here — `CartView` sends an id and a quantity per line
 * and the server prices the order from stored menu data. Views format money, route, fetch and report
 * errors themselves; this module does none of those and holds no error vocabulary (rule R-6).
 *
 * It reads the session only to learn when the session ends, so `CartProvider` must render inside
 * `SessionProvider`, as `main.tsx` nests it.
 *
 * @module client/src/state/cart
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import type { MenuItem } from '../api/types';
import { useSession } from './session';

/** Smallest quantity a line may hold; a lower requested quantity removes the line instead. */
const MIN_QUANTITY = 1;

/** Largest quantity a line may hold: the per-line maximum the server accepts. */
const MAX_QUANTITY = 20;

/**
 * One line of the cart: the item chosen and how many of it. `price_cents` is the price the item
 * carried when the line was added, kept so the cart can show a subtotal without another request; the
 * server recomputes every line when the order is placed, so it is never the amount charged.
 */
export interface CartLine {
    /** Id of the menu item, the key that merges two additions of the same item into one line. */
    menu_item_id: string;
    /** Item name as the API reported it when the line was added. */
    name: string;
    /** Item price in integer cents, a display copy taken when the line was added. */
    price_cents: number;
    /** How many of the item the shopper wants; always within 1..20. */
    quantity: number;
    /** Item image, or null when the item has none. */
    image_url: string | null;
}

/** What the provider exposes and {@link useCart} returns. */
export interface CartValue {
    /** The current lines, newest last; readonly so a view cannot push or mutate one. */
    items: readonly CartLine[];
    /** Adds a quantity of an item, merging into its existing line when it is already in the cart. */
    add(item: MenuItem, quantity?: number): void;
    /** Sets a line's quantity, clamped to the accepted range; 0 or less removes the line. */
    updateQuantity(menuItemId: string, quantity: number): void;
    /** Drops a line; an id the cart does not hold is a no-op. */
    remove(menuItemId: string): void;
    /** Empties the cart, which the views do when an order is confirmed. */
    clear(): void;
    /** Sum of every line's `price_cents * quantity`, in integer cents; 0 for an empty cart. */
    totalCents: number;
    /** Sum of every line's quantity, the number of items rather than of distinct lines. */
    itemCount: number;
}

/** Null outside a provider, which makes {@link useCart} fail loudly rather than silently. */
const CartContext = createContext<CartValue | null>(null);

/**
 * Clamps a requested quantity into the 1..20 range the server accepts for one order line. Quantities
 * are whole numbers, so a fractional request is truncated; a request that is not a number at all
 * becomes the minimum, so no line can hold a quantity that would be rejected.
 *
 * @param quantity - The requested quantity, trusted no further than this.
 * @returns That quantity as a whole number within {@link MIN_QUANTITY}..{@link MAX_QUANTITY}.
 */
function clampQuantity(quantity: number): number {
    if (Number.isNaN(quantity)) {
        return MIN_QUANTITY;
    }
    return Math.min(Math.max(Math.trunc(quantity), MIN_QUANTITY), MAX_QUANTITY);
}

/**
 * Holds the cart for the whole client and drops it when the session ends. Every mutation returns a
 * new line array, so a component that read `items` keeps the snapshot it rendered.
 *
 * @param props - The subtree that may read the cart through {@link useCart}.
 * @returns The provider element wrapping that subtree.
 */
export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<readonly CartLine[]>([]);
    const { status } = useSession();

    const add = useCallback((item: MenuItem, quantity = 1): void => {
        const step = clampQuantity(quantity);

        setItems((current) => {
            // Merging keeps the line where it is, so the cart never reorders itself under the
            // shopper; a first addition appends.
            if (current.some((line) => line.menu_item_id === item.id)) {
                return current.map((line) =>
                    line.menu_item_id === item.id
                        ? { ...line, quantity: clampQuantity(line.quantity + step) }
                        : line,
                );
            }

            return [
                ...current,
                {
                    menu_item_id: item.id,
                    name: item.name,
                    price_cents: item.price_cents,
                    quantity: step,
                    image_url: item.image_url ?? null,
                },
            ];
        });
    }, []);

    const updateQuantity = useCallback((menuItemId: string, quantity: number): void => {
        setItems((current) => {
            // At or below zero the line goes rather than being clamped up to one more of the item,
            // and a value that is not a number cannot be shown, so it goes the same way.
            if (quantity <= 0 || Number.isNaN(quantity)) {
                return current.filter((line) => line.menu_item_id !== menuItemId);
            }

            const clamped = clampQuantity(quantity);
            return current.map((line) =>
                line.menu_item_id === menuItemId ? { ...line, quantity: clamped } : line,
            );
        });
    }, []);

    const remove = useCallback((menuItemId: string): void => {
        setItems((current) => current.filter((line) => line.menu_item_id !== menuItemId));
    }, []);

    const clear = useCallback((): void => {
        setItems([]);
    }, []);

    // The one link to the session: a cart belongs to a session, so it ends with it. Logging out and
    // the 401 path both land on 'anonymous', which covers the two clears this module owes; an order
    // confirmation is the third and is `CartView` calling `clear()`. Bailing out on an empty cart
    // keeps the first anonymous render from re-rendering for nothing.
    useEffect(() => {
        if (status === 'anonymous') {
            setItems((current) => (current.length === 0 ? current : []));
        }
    }, [status]);

    const totalCents = useMemo(
        () => items.reduce((sum, line) => sum + line.price_cents * line.quantity, 0),
        [items],
    );

    // The badge a shopper expects counts items, not distinct lines: two burgers read as 2.
    const itemCount = useMemo(() => items.reduce((sum, line) => sum + line.quantity, 0), [items]);

    const value = useMemo<CartValue>(
        () => ({ items, add, updateQuantity, remove, clear, totalCents, itemCount }),
        [items, add, updateQuantity, remove, clear, totalCents, itemCount],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Reads the cart of the nearest {@link CartProvider}.
 *
 * @returns The current lines, the four mutations and the two display totals.
 * @throws {Error} Outside a provider, where a silently empty cart would hide a real bug.
 */
export function useCart(): CartValue {
    const value = useContext(CartContext);
    if (value === null) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return value;
}

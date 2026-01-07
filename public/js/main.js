/**
 * Client-Side JavaScript Module
 * 
 * This module provides interactive functionality for the Express.js UI layer.
 * Implements time-based greeting updates that dynamically change the displayed
 * greeting based on the current time of day.
 * 
 * Served via express.static() middleware at /js/main.js URL.
 * 
 * Time periods:
 * - Morning: 5:00 AM - 11:59 AM (hours 5-11)
 * - Afternoon: 12:00 PM - 4:59 PM (hours 12-16)
 * - Evening: 5:00 PM - 8:59 PM (hours 17-20)
 * - Night: 9:00 PM - 4:59 AM (hours 21-23, 0-4)
 * 
 * @module public/js/main
 */

'use strict';

/**
 * Time period constants for greeting logic
 * @constant {Object}
 */
const TIME_PERIODS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  NIGHT: 'night'
};

/**
 * Greeting messages corresponding to time periods
 * @constant {Object}
 */
const GREETINGS = {
  morning: 'Good morning!',
  afternoon: 'Good afternoon!',
  evening: 'Good evening!',
  night: 'Good night!'
};

/**
 * CSS classes for theme management
 * @constant {Object}
 */
const CSS_CLASSES = {
  EVENING_THEME: 'evening-theme',
  NIGHT_THEME: 'night-theme',
  GREETING_UPDATED: 'greeting-updated'
};

/**
 * DOM selectors for element targeting
 * @constant {Object}
 */
const SELECTORS = {
  GREETING_CONTAINER: '.greeting-container',
  GREETING_TEXT: '.greeting-text',
  GREETING_TITLE: 'h1'
};

/**
 * Update interval in milliseconds (1 minute)
 * @constant {number}
 */
const UPDATE_INTERVAL_MS = 60000;

/**
 * Determines the current time period based on the hour of day.
 * 
 * Time breakdown:
 * - Morning: 5 <= hour < 12
 * - Afternoon: 12 <= hour < 17
 * - Evening: 17 <= hour < 21
 * - Night: 21 <= hour < 24 OR 0 <= hour < 5
 * 
 * @returns {string} Current time period (morning|afternoon|evening|night)
 */
function getTimeOfDay() {
  var currentHour = new Date().getHours();
  
  if (currentHour >= 5 && currentHour < 12) {
    return TIME_PERIODS.MORNING;
  } else if (currentHour >= 12 && currentHour < 17) {
    return TIME_PERIODS.AFTERNOON;
  } else if (currentHour >= 17 && currentHour < 21) {
    return TIME_PERIODS.EVENING;
  } else {
    return TIME_PERIODS.NIGHT;
  }
}

/**
 * Gets the appropriate greeting message for the current time period.
 * 
 * @returns {string} Greeting message based on current time of day
 */
function getGreetingMessage() {
  var timePeriod = getTimeOfDay();
  return GREETINGS[timePeriod] || GREETINGS.morning;
}

/**
 * Checks if the current time qualifies for evening/night theme.
 * Evening theme applies during evening and night periods.
 * 
 * @returns {boolean} True if evening or night theme should be applied
 */
function isEveningOrNight() {
  var timePeriod = getTimeOfDay();
  return timePeriod === TIME_PERIODS.EVENING || timePeriod === TIME_PERIODS.NIGHT;
}

/**
 * Applies or removes theme classes on the document body based on time of day.
 * Adds 'evening-theme' or 'night-theme' class during evening/night hours.
 * 
 * @returns {void}
 */
function applyThemeClass() {
  var body = document.body;
  var timePeriod = getTimeOfDay();
  
  // Remove existing theme classes first
  body.classList.remove(CSS_CLASSES.EVENING_THEME);
  body.classList.remove(CSS_CLASSES.NIGHT_THEME);
  
  // Apply appropriate theme class based on time period
  if (timePeriod === TIME_PERIODS.EVENING) {
    body.classList.add(CSS_CLASSES.EVENING_THEME);
  } else if (timePeriod === TIME_PERIODS.NIGHT) {
    body.classList.add(CSS_CLASSES.NIGHT_THEME);
  }
}

/**
 * Adds a visual transition effect when the greeting is updated.
 * Applies and removes the 'greeting-updated' class for CSS transitions.
 * 
 * @param {HTMLElement} element - The element to apply the transition to
 * @returns {void}
 */
function addTransitionEffect(element) {
  if (!element) {
    return;
  }
  
  // Add the transition class
  element.classList.add(CSS_CLASSES.GREETING_UPDATED);
  
  // Remove the class after animation completes (300ms)
  setTimeout(function() {
    element.classList.remove(CSS_CLASSES.GREETING_UPDATED);
  }, 300);
}

/**
 * Updates the greeting display element with the current time-appropriate greeting.
 * Searches for greeting elements using configured selectors and updates text content.
 * Also applies appropriate theme classes and transition effects.
 * 
 * @returns {boolean} True if greeting was updated successfully, false otherwise
 */
function updateGreeting() {
  // Try multiple selectors to find the greeting element
  var greetingElement = document.querySelector(SELECTORS.GREETING_TEXT) ||
                        document.querySelector(SELECTORS.GREETING_CONTAINER + ' ' + SELECTORS.GREETING_TITLE) ||
                        document.querySelector(SELECTORS.GREETING_TITLE);
  
  // Apply theme class regardless of whether greeting element exists
  applyThemeClass();
  
  // If no greeting element found, exit gracefully without errors
  if (!greetingElement) {
    return false;
  }
  
  var newGreeting = getGreetingMessage();
  var currentText = greetingElement.textContent || greetingElement.innerText;
  
  // Only update if the greeting has changed
  if (currentText !== newGreeting) {
    // Add transition effect before updating
    addTransitionEffect(greetingElement);
    
    // Update the greeting text
    greetingElement.textContent = newGreeting;
  }
  
  return true;
}

/**
 * Initializes the time-based greeting system.
 * Sets up initial greeting and schedules periodic updates.
 * 
 * @returns {void}
 */
function initializeGreetingSystem() {
  // Perform initial update
  updateGreeting();
  
  // Set up periodic updates (every minute)
  setInterval(updateGreeting, UPDATE_INTERVAL_MS);
}

/**
 * Safely initializes the application when DOM is ready.
 * Wraps initialization in try-catch to prevent console errors.
 * 
 * @returns {void}
 */
function safeInit() {
  try {
    initializeGreetingSystem();
  } catch (error) {
    // Silently handle errors to prevent console errors per acceptance criteria
    // In development, you might want to log this: console.warn('Greeting system init failed:', error);
  }
}

/**
 * Main entry point - waits for DOM to be fully loaded before initialization.
 * Uses DOMContentLoaded event to ensure all elements are available.
 */
if (document.readyState === 'loading') {
  // DOM is still loading, add event listener
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  // DOM already loaded, initialize immediately
  safeInit();
}

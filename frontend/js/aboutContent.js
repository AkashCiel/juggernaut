/**
 * About Content - Philosophy and product description
 * Separated into a variable for easy maintenance and reuse
 */

export const aboutContent = {
    // Intro sections for the landing page modal (separated by "—")
    introSections: [
        "In the modern world, news is extremely cheap and abundant",
        "So what we have is an exhausting overload of information",
        "But what we need is highly focused information",
        "I built this product to solve this problem",
        "You can talk to the app and decide what you want to see in your news feed",
        "TIP: with highly precise input, you get extremely relevant but shorter feed",
        "with relatively generic inputs, you get moderately relevant but longer feed",
        "This app will never seek investment or sponsorship, ensuring freedom from bias"
    ],
    // Full philosophy text for the About button modal (generated dynamically from introSections)
    get philosophy() {
        return this.introSections
            .map(section => section.trim())
            .map(section => section.endsWith('.') ? section : section + '.')
            .join(' ');
    }
};


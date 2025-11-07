document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');

    const emailDisplay = document.getElementById('userEmailDisplay');
    const yearDisplay = document.getElementById('currentYear');

    if (yearDisplay) {
        yearDisplay.textContent = new Date().getFullYear();
    }

    if (!email) {
        if (emailDisplay) {
            emailDisplay.textContent = 'No email provided. Check your invitation link.';
            emailDisplay.style.color = '#EF4444';
        }
        return;
    }

    if (emailDisplay) {
        emailDisplay.textContent = email;
    }
});


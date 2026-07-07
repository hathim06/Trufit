(function () {
    const messages = {
        email: 'Enter a valid email address.',
        tel: 'Enter a valid 10 digit mobile number.',
        number: 'Enter a valid number.',
        date: 'Choose a valid date.',
        password: 'Password is required.',
        text: 'This field is required.'
    };

    const labelFor = (field) => {
        const explicit = field.getAttribute('data-label') || field.getAttribute('aria-label');
        if (explicit) return explicit;
        const label = field.id ? document.querySelector(`label[for="${field.id}"]`) : null;
        if (label) return label.textContent.trim().replace(/[:*]$/, '');
        return (field.name || field.placeholder || 'This field').replace(/([A-Z])/g, ' $1').trim();
    };

    const getMessage = (field) => {
        const value = (field.value || '').trim();
        const label = labelFor(field);
        if (field.hasAttribute('required') && !value) return `${label} is required.`;
        if (!value) return '';
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return messages.email;
        if (field.type === 'tel' && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return messages.tel;
        if (field.type === 'number') {
            const numberValue = Number(value);
            if (!Number.isFinite(numberValue)) return messages.number;
            if (field.min !== '' && numberValue < Number(field.min)) return `${label} must be at least ${field.min}.`;
            if (field.max !== '' && numberValue > Number(field.max)) return `${label} must be at most ${field.max}.`;
        }
        if (field.minLength > 0 && value.length < field.minLength) return `${label} must be at least ${field.minLength} characters.`;
        if (field.maxLength > 0 && value.length > field.maxLength) return `${label} must be ${field.maxLength} characters or fewer.`;
        if (field.pattern) {
            try {
                if (!new RegExp(`^(?:${field.pattern})$`).test(value)) return field.title || `${label} has an invalid format.`;
            } catch (error) {
                return '';
            }
        }
        return '';
    };

    const showError = (field, message) => {
        field.classList.toggle('js-invalid', Boolean(message));
        let error = field.parentElement.querySelector(`.field-error[data-for="${field.name || field.id}"]`);
        if (!error && message) {
            error = document.createElement('div');
            error.className = 'field-error';
            error.dataset.for = field.name || field.id;
            field.insertAdjacentElement('afterend', error);
        }
        if (error) {
            error.textContent = message;
            error.style.display = message ? 'block' : 'none';
        }
    };

    const validateField = (field) => {
        const message = getMessage(field);
        showError(field, message);
        return !message;
    };

    const validateForm = (form) => {
        const fields = Array.from(form.querySelectorAll('input, select, textarea'))
            .filter(field => !field.disabled && field.type !== 'hidden' && field.type !== 'submit' && field.type !== 'button');
        let isValid = true;
        fields.forEach(field => {
            if (!validateField(field)) isValid = false;
        });
        if (!isValid) {
            const firstInvalid = form.querySelector('.js-invalid');
            if (firstInvalid) firstInvalid.focus();
        }
        return isValid;
    };

    const injectStyles = () => {
        if (document.getElementById('client-validator-styles')) return;
        const style = document.createElement('style');
        style.id = 'client-validator-styles';
        style.textContent = '.js-invalid{border-color:#DC2626!important;box-shadow:0 0 0 3px rgba(220,38,38,.08)!important}.field-error{margin-top:6px;color:#DC2626;font-size:12px;font-weight:600;line-height:1.35}';
        document.head.appendChild(style);
    };

    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        document.querySelectorAll('form').forEach(form => {
            form.setAttribute('novalidate', 'novalidate');
            form.addEventListener('submit', event => {
                if (!validateForm(form)) event.preventDefault();
            });
            form.addEventListener('input', event => {
                if (event.target.matches('input, textarea')) validateField(event.target);
            });
            form.addEventListener('change', event => {
                if (event.target.matches('select, input, textarea')) validateField(event.target);
            });
        });
    });

    window.AppFormValidator = { validateField, validateForm };
})();



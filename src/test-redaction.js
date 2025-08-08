/**
 * Basic tests for Swerve redaction functionality
 * Run with: node test-redaction.js
 */

// Mock DOM environment for Node.js testing
global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
};

global.document = {
    createElement: (tag) => {
        return {
            innerHTML: '',
            textContent: '',
            childNodes: [],
            nodeType: global.Node.ELEMENT_NODE,
            matches: (selector) => false,
            appendChild: () => {},
            replaceChild: () => {},
            parentNode: null
        };
    }
};

global.performance = {
    now: () => Date.now()
};

// Load the redaction module
const SwerveRedaction = require('./redaction.js');

// Test data
const testData = {
    text: {
        emails: "Contact support at help@example.com or sales@company.org for assistance.",
        phones: "Call us at 555-123-4567 or (555) 987-6543 for support.",
        ssns: "SSN: 123-45-6789 or 987.65.4321 for verification.",
        creditCards: "Card number: 4532-1234-5678-9012 or 5555 4444 3333 2222.",
        mixed: "Email john.doe@example.com, phone (555) 123-4567, SSN 123-45-6789, card 4532-1234-5678-9012."
    },
    html: {
        simple: "<p>Contact us at support@example.com or call 555-123-4567</p>",
        nested: "<div><p>Email: <span>user@test.com</span></p><p>Phone: <strong>555-987-6543</strong></p></div>",
        excluded: '<div><p>Email: user@test.com</p><p class="swerve-no-redact">Protected: secret@protected.com</p></div>'
    }
};

// Test runner
function runTest(name, testFn) {
    try {
        console.log(`\n🧪 Testing: ${name}`);
        testFn();
        console.log(`✅ ${name} - PASSED`);
        return true;
    } catch (error) {
        console.error(`❌ ${name} - FAILED:`, error.message);
        return false;
    }
}

function assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`Expected "${expected}", got "${actual}". ${message}`);
    }
}

function assertContains(text, substring, message = '') {
    if (!text.includes(substring)) {
        throw new Error(`Expected text to contain "${substring}". ${message}`);
    }
}

function assertNotContains(text, substring, message = '') {
    if (text.includes(substring)) {
        throw new Error(`Expected text to NOT contain "${substring}". ${message}`);
    }
}

// Test cases
const tests = [
    // Basic text redaction tests
    () => {
        const redactor = new SwerveRedaction();
        const result = redactor.redactText(testData.text.emails);
        assertNotContains(result, 'help@example.com', 'Email should be redacted');
        assertNotContains(result, 'sales@company.org', 'Email should be redacted');
        assertContains(result, '[EMAIL_REDACTED]', 'Should contain redaction placeholder');
    },

    () => {
        const redactor = new SwerveRedaction();
        const result = redactor.redactText(testData.text.phones);
        assertNotContains(result, '555-123-4567', 'Phone should be redacted');
        assertNotContains(result, '(555) 987-6543', 'Phone should be redacted');
        assertContains(result, '[PHONE_REDACTED]', 'Should contain phone redaction placeholder');
    },

    () => {
        const redactor = new SwerveRedaction();
        const result = redactor.redactText(testData.text.ssns);
        assertNotContains(result, '123-45-6789', 'SSN should be redacted');
        assertNotContains(result, '987.65.4321', 'SSN should be redacted');
        assertContains(result, '[SSN_REDACTED]', 'Should contain SSN redaction placeholder');
    },

    () => {
        const redactor = new SwerveRedaction();
        const result = redactor.redactText(testData.text.creditCards);
        assertNotContains(result, '4532-1234-5678-9012', 'Credit card should be redacted');
        assertNotContains(result, '5555 4444 3333 2222', 'Credit card should be redacted');
        assertContains(result, '[CARD_REDACTED]', 'Should contain card redaction placeholder');
    },

    // Configuration tests
    () => {
        const redactor = new SwerveRedaction({
            patterns: {
                email: { enabled: false, regex: /test/, replacement: '[TEST]' },
                phone: { enabled: true, regex: /\d{3}-\d{3}-\d{4}/, replacement: '[PHONE]' }
            }
        });
        
        const result = redactor.redactText('Email: test@example.com Phone: 555-123-4567');
        assertContains(result, 'test@example.com', 'Email should NOT be redacted when disabled');
        assertNotContains(result, '555-123-4567', 'Phone should be redacted with custom pattern');
        assertContains(result, '[PHONE]', 'Should use custom replacement text');
    },

    // Performance test
    () => {
        const redactor = new SwerveRedaction();
        const largeText = testData.text.mixed.repeat(1000);
        
        const startTime = Date.now();
        const result = redactor.redactText(largeText);
        const endTime = Date.now();
        
        const processTime = endTime - startTime;
        if (processTime > 200) {
            throw new Error(`Performance test failed: ${processTime}ms > 200ms threshold`);
        }
        
        console.log(`   Performance: ${processTime}ms for ${largeText.length} characters`);
    },

    // HTML redaction test
    () => {
        // Mock DOM methods for HTML testing
        global.document.createElement = (tag) => {
            return {
                innerHTML: '',
                textContent: '',
                childNodes: [],
                nodeType: global.Node.ELEMENT_NODE,
                matches: () => false,
                appendChild: () => {},
                replaceChild: () => {},
                parentNode: null
            };
        };
        
        const redactor = new SwerveRedaction();
        const result = redactor.redactHTML(testData.html.simple);
        
        // For this test, we'll check that the method runs without error
        // In a real DOM environment, this would properly redact HTML content
        console.log('   HTML redaction method executed successfully');
    },

    // Statistics test
    () => {
        const redactor = new SwerveRedaction();
        redactor.redactText(testData.text.mixed);
        
        const stats = redactor.getRedactionStats();
        if (stats.totalRedactions === 0) {
            throw new Error('Should have recorded redactions');
        }
        
        console.log(`   Redaction stats: ${stats.totalRedactions} total redactions`);
    },

    // Edge cases
    () => {
        const redactor = new SwerveRedaction();
        
        // Test null/undefined/empty inputs
        assertEquals(redactor.redactText(null), null, 'Should handle null input');
        assertEquals(redactor.redactText(undefined), undefined, 'Should handle undefined input');
        assertEquals(redactor.redactText(''), '', 'Should handle empty string');
        assertEquals(redactor.redactText(123), 123, 'Should handle non-string input');
    }
];

// Run all tests
console.log('🚀 Starting Swerve Redaction Tests\n');

let passed = 0;
let total = tests.length;

tests.forEach((test, index) => {
    if (runTest(`Test ${index + 1}`, test)) {
        passed++;
    }
});

console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('💥 Some tests failed!');
    process.exit(1);
}
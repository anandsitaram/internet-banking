package com.demo.ib.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PasswordPolicyTest {
    @Test
    void acceptsStrongPassword() {
        assertTrue(PasswordPolicy.violations("Correct-Horse#9Battery", "alex").isEmpty());
    }

    @Test
    void rejectsShortPassword() {
        assertEquals(1, PasswordPolicy.violations("Ab1#", "alex").size());
    }

    @Test
    void rejectsMissingClasses() {
        assertFalse(PasswordPolicy.violations("alllowercaseletters", "x1").isEmpty());
        assertFalse(PasswordPolicy.violations("NoSymbolsOrDigitsHere", "x1").isEmpty());
    }

    @Test
    void rejectsPasswordContainingUsername() {
        assertTrue(PasswordPolicy.violations("Xx-customer.alex-9Z", "customer.alex")
            .contains("must not contain the username"));
    }

    @Test
    void rejectsNull() {
        assertFalse(PasswordPolicy.violations(null, "alex").isEmpty());
    }
}

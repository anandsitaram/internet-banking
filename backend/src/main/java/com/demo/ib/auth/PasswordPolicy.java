package com.demo.ib.auth;

import java.util.ArrayList;
import java.util.List;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    /** Returns human-readable violations; empty list means the password is acceptable. */
    public static List<String> violations(String password, String username) {
        List<String> v = new ArrayList<>();
        if (password == null || password.length() < 12) { v.add("at least 12 characters"); return v; }
        if (password.length() > 128) v.add("at most 128 characters");
        if (password.chars().noneMatch(Character::isUpperCase)) v.add("an uppercase letter");
        if (password.chars().noneMatch(Character::isLowerCase)) v.add("a lowercase letter");
        if (password.chars().noneMatch(Character::isDigit)) v.add("a digit");
        if (password.chars().allMatch(Character::isLetterOrDigit)) v.add("a symbol");
        if (username != null && username.length() >= 3
                && password.toLowerCase().contains(username.toLowerCase())) {
            v.add("must not contain the username");
        }
        return v;
    }

    public static String describe(List<String> violations) {
        return "Password must have: " + String.join(", ", violations) + ".";
    }
}

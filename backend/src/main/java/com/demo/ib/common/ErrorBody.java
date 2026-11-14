package com.demo.ib.common;

import java.util.Map;

public record ErrorBody(String error, String message, Map<String, String> fields) {
    public static ErrorBody of(String error, String message) {
        return new ErrorBody(error, message, null);
    }
}

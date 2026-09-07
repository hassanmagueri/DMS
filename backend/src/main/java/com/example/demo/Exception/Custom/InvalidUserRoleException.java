package com.example.demo.Exception.Custom;

public class InvalidUserRoleException extends RuntimeException {
    public InvalidUserRoleException(String s) {
        super(s);
    }
}

package com.example.demo.Model.Dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

public record ErrorResponse(
        int status,
        String message,
        LocalDateTime timestamp
) {}

//
//@AllArgsConstructor
//@Getter
//@Setter
//public class ErrorResponse {
//    private int status;
//    private String message;
//    private LocalDateTime timestamp;
//}

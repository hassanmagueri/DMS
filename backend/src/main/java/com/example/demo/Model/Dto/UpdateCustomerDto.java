package com.example.demo.Model.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;


@ToString
@Getter
@Setter
public class UpdateCustomerDto {
    @Size(max = 50, message = "First name must not exceed 50 characters")
    private String firstName;

    @Size(max = 50, message = "Last name must not exceed 50 characters")
    private String lastName;

    @Email(message = "Email must be valid")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;
//
//
//    @NotBlank(message = "First name is required")
//    @Size(max = 50, message = "First name must not exceed 50 characters")
//    private String username;
//
//    @NotBlank(message = "First name is required")
//    @Size(max = 50, message = "First name must not exceed 50 characters")
//    private String firstName;
//
//    @NotBlank(message = "Last name is required")
//    @Size(max = 50, message = "Last name must not exceed 50 characters")
//    private String lastName;
//
//    @NotBlank(message = "Email is required")
//    @Email(message = "Email must be valid")
//    @Size(max = 100, message = "Email must not exceed 100 characters")
//    private String email;
//
//    @NotBlank(message = "Phone is required")
//    @Size(max = 20, message = "Phone must not exceed 20 characters")
//    private String phone;
//
//    @NotBlank(message = "Password is required")
//    private String password;


}

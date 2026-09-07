package com.example.demo.Model.Dto;

import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.Enums.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@ToString
public class ResponseUserDto {
    private Long id;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;

    private UserStatus status;

    private LocalDateTime createdAt;

    private UserRole role;

    private String username;

    private boolean enabled;

}

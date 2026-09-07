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
public class ResponseUserPublicDto {

    private String firstName;

    private String lastName;

    private String phone;

    private LocalDateTime createdAt;

    private UserRole role;

    private String username;


}

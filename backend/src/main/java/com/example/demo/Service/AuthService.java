package com.example.demo.Service;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.LoginDTO;
import com.example.demo.Model.Dto.ResponseUserDto;
import org.jspecify.annotations.NonNull;

import java.util.Map;

public interface AuthService {
    ResponseUserDto signUp(CreateUserDto signUpDTO);
    Map<String, String> login(@NonNull LoginDTO loginDTO);

    String refreshToken(String refreshToken);
}

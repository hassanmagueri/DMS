package com.example.demo.Service;

import com.example.demo.Model.Entity.User;

public interface JwtService {


    String generateAccessToken(User user);

    Long getUserIdFromAccessToken(String token);

    String generateRefreshToken(User user);

    Long getUserIdFromRefreshToken(String token);

    }


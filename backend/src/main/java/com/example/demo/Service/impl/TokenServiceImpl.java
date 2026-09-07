package com.example.demo.Service.impl;

import com.example.demo.Model.Entity.Token;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.TokenRepository;
import com.example.demo.Service.JwtService;
import com.example.demo.Service.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TokenServiceImpl implements TokenService {
    private final TokenRepository tokenRepository;
    private final JwtService jwtService;

    public String createAccessToken(User user) {
        return jwtService.generateAccessToken(user);
    }

    public String createRefreshToken(User user) {
        String RefreshToken = jwtService.generateRefreshToken(user);
        Token token = new Token();
        token.setToken(RefreshToken);
        token.setUser(user);
        token.setRevoked(false);
        token.setCreatedAt(LocalDate.from(LocalDateTime.now()));
        tokenRepository.save(token);
        return RefreshToken;
    }

    public Map<String, String> createAccessAndRefreshToken(User user) {
        String accessToken = createAccessToken(user);
        String refreshToken = createRefreshToken(user);
        return Map.of("access_token", accessToken, "refresh_token", refreshToken);
    }

    public boolean isRefreshTokenValid(String refreshToken) {
        Token token = tokenRepository.findByToken(refreshToken).orElse(null);
        if (token == null || !token.getRevoked()) {
            return false;
        }
        Long userId = jwtService.getUserIdFromAccessToken(refreshToken);
        return token.getUser().getId().equals(userId);
    }

    public Long getId(String refreshToken) {
        Token token = tokenRepository.findByToken(refreshToken).orElse(null);
        if (token == null || !token.getRevoked()) {
            return null;
        }
        Long userId = jwtService.getUserIdFromRefreshToken(refreshToken);
        return token.getUser().getId().equals(userId) ? userId : null;
    }
}

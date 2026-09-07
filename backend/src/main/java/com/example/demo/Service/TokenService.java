package com.example.demo.Service;


import com.example.demo.Model.Entity.Token;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.TokenRepository;
import jakarta.validation.constraints.Null;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public interface TokenService {
    public String createAccessToken(User user) ;

    public String createRefreshToken(User user) ;

    public Map<String, String> createAccessAndRefreshToken(User user);

    public boolean isRefreshTokenValid(String refreshToken);
    public Long getId(String refreshToken);
}

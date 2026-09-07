package com.example.demo.Service.impl;

import com.example.demo.Exception.Custom.UsernameAlreadyExistsException;
import com.example.demo.Mapper.UserMapper;
import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.LoginDTO;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Entity.Enums.UserRole;
import com.example.demo.Model.Entity.Enums.UserStatus;
import com.example.demo.Model.Entity.User;
import com.example.demo.Repository.UserRepository;
import com.example.demo.Service.AuthService;
import com.example.demo.Service.TokenService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AuthenticationManager authenticationManager;

//    private final JwtService jwtService;

    //---------------------------SignUp------------------------
    public ResponseUserDto signUp(CreateUserDto signUpDTO) {
        System.out.println("JwtService: SignUpDTO " + signUpDTO);
        userRepository.findByUsername(signUpDTO.getUsername()).ifPresent(u -> {
            throw new UsernameAlreadyExistsException("username already exists");
        });
        System.out.println("JwtService: SignUpDTO after check " + signUpDTO);
        User toBeCreatedUser = userMapper.toEntity(signUpDTO);
        toBeCreatedUser.setEnabled(false);
        toBeCreatedUser.setRole(UserRole.CUSTOMER);
        toBeCreatedUser.setStatus(UserStatus.INACTIVE);
        toBeCreatedUser.setPassword(passwordEncoder.encode(signUpDTO.getPassword()));

        User savedUser = userRepository.save(toBeCreatedUser);

//        String token = jwtService.generateAccessToken(savedUser);
        String token = tokenService.createAccessToken(savedUser);
//        System.out.println("AuthService: generated token " + token);

        return userMapper.toResponseDto(savedUser, token);
    }

    //---------------------------Login------------------------
    public Map<String, String> login(@NonNull LoginDTO loginDTO) {
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(loginDTO.getUsername(), loginDTO.getPassword());
        // this is the last out I got why is the problem doesn't authenticate or what
        Authentication authentication = authenticationManager.authenticate(token);
        System.out.println("AuthService: authentication " + authentication);
        User user = (User) authentication.getPrincipal();
        return tokenService.createAccessAndRefreshToken(user);
    }

    @Override
    public String refreshToken(String refreshToken) {
        Long userId = tokenService.getId(refreshToken);
        System.out.println("AuthService: userId from refresh token " + userId);
        User user = userRepository.findById(userId).orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));
        if (userId == null) throw new BadCredentialsException("Invalid refresh token");
        return tokenService.createAccessToken(user);
    }


}

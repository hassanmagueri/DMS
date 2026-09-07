package com.example.demo.Controller;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.LoginDTO;
import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    //---------------------------SignUp------------------------
    @PostMapping("/signup")
    public ResponseEntity<ResponseUserDto> signup(@RequestBody @Valid CreateUserDto signUpDTO) {
        System.out.println("AuthController: SignUpDTO " + signUpDTO);
        ResponseUserDto userDTO = authService.signUp(signUpDTO);

        return ResponseEntity.ok(userDTO);
    }

    //---------------------------Login------------------------
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginDTO loginDTO, HttpServletResponse response) {
        System.out.println("AuthController: LoginDTO " + loginDTO);
        Map<String, String> token = authService.login(loginDTO);
        System.out.println("AuthController: generated token " + token);
        Cookie cookie = new Cookie("refresh_token", token.get("refresh_token"));
        cookie.setHttpOnly(true); // JavaScript cannot read this cookie
        response.addCookie(cookie);

        return ResponseEntity.ok(Map.of("accessToken", token.get("access_token")));
    }


    @PostMapping("/refresh")
    public ResponseEntity<String> refreshToken(HttpServletRequest request) throws Exception {

        System.out.println("AuthController: Refresh token request received");
        String refreshToken =  Arrays.stream(request.getCookies())
                .filter(cookie -> "refresh_token".equals(cookie.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .orElseThrow(() -> new RuntimeException("Refresh token not found"));
        System.out.println("AuthController: Refresh token found: " + refreshToken);
        String accessToken = authService.refreshToken(refreshToken);
        System.out.println("AuthController: New access token generated: " + accessToken);

        return ResponseEntity.ok(accessToken);
    }

}

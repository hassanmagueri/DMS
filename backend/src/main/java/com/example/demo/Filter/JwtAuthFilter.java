package com.example.demo.Filter;

import com.example.demo.Model.Entity.User;
import com.example.demo.Service.JwtService;
import com.example.demo.Service.UserService;
import com.example.demo.Service.impl.JwtServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter     {
    final JwtService jwtService;
    final UserService userService;


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            final String requestTokenHeader = request.getHeader("Authorization");
            System.out.println("JwtAuthFilter: requestTokenHeader " + requestTokenHeader);

            if (requestTokenHeader == null || !requestTokenHeader.startsWith("Bearer")) {
                System.out.println("JwtAuthFilter: No JWT token found in request headers");
                filterChain.doFilter(request, response);
                return;
            }

            String token = requestTokenHeader.substring(7);

            Long userId = jwtService.getUserIdFromAccessToken(token);

            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                User user = userService.getUserById(userId);
                System.out.println("JwtAuthFilter: userAuthorities " + user.getAuthorities());
                System.out.println("JwtAuthFilter: user " + user);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        user.getAuthorities()
                );
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                // Here we bypassed authenticationManager.authenticate(authToken) and directly added our auth object to security context and any object inside security context is already validated.
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            filterChain.doFilter(request, response);
        } catch (Exception e) {
            System.err.println("JwtAuthFilter: Exception " + e.getMessage());
            throw new ServletException("JwtAuthFilter: Exception " + e.getMessage());
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getServletPath().equals("/api/auth/refresh");
    }
}

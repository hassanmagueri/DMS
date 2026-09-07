package com.example.demo.Controller;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Service.DispatcherService;
import com.example.demo.Service.DriverService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dispatcher")
public class DispatcherController {
    final DriverService driverService;
    final DispatcherService dispatcherService;

    @PostMapping("/drivers")
    ResponseEntity<?> createDriver(@RequestBody @Valid CreateUserDto driver) {
        System.out.println("AdminController: Received request to create driver: " + driver);
        return ResponseEntity.ok(driverService.create(driver));
    }
}

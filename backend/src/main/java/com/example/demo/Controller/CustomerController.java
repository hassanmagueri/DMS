package com.example.demo.Controller;

import com.example.demo.Model.Dto.ResponseUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateCustomerDto;
import com.example.demo.Model.Entity.User;
import com.example.demo.Service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.Response;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {
    final CustomerService customerService;

    @GetMapping("/me")
    ResponseUserDto getCustomer(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof User user))
            throw new IllegalStateException("Invalid authentication principal");
        // Implement logic to retrieve customer information
        return customerService.getCustomerById(user.getId()); // Placeholder response
    }

    @GetMapping("/{id}")
    ResponseUserPublicDto getCustomerById(@PathVariable Long id) {
        System.out.println("CustomerController: Received request to get customer by id: " + id);
        return customerService.getCustomerPublicById(id);
    }

    @PutMapping("/me")
    ResponseUserDto updateCustomer(@RequestBody UpdateCustomerDto updateCustomerDto, Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof User user))
            throw new IllegalStateException("Invalid authentication principal");
        // Implement logic to update customer information
        return customerService.updateCustomer(user.getId(), updateCustomerDto); // Placeholder response
    }

    @DeleteMapping("/me")
    ResponseEntity<String> deleteCustomer(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof User user))
            throw new IllegalStateException("Invalid authentication principal");
        System.out.println("CustomerController: Received request to delete customer with id: " + user);
        customerService.deleteCustomer(user.getId());
        return ResponseEntity.ok("delete successfully");
    }

    @GetMapping("/list")
    List<ResponseUserPublicDto> getCustomerList() {
        return customerService.getAllCustomers();
    }

}

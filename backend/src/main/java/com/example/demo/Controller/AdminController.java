package com.example.demo.Controller;

import com.example.demo.Model.Dto.CreateUserDto;
import com.example.demo.Model.Dto.ResponseUserPublicDto;
import com.example.demo.Model.Dto.UpdateCustomerDto;
import com.example.demo.Model.Dto.UpdateUserDto;
import com.example.demo.Model.Entity.User;
import com.example.demo.Service.CustomerService;
import com.example.demo.Service.DispatcherService;
import com.example.demo.Service.DriverService;
import com.example.demo.Service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {
    final DriverService driverService;
    final DispatcherService dispatcherService;
    private final CustomerService customerService;
    private final UserService userService;
//    final UserService dispatcherService;

    //    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/dispatchers")
    ResponseEntity<?> createDispatcher(@RequestBody @Valid CreateUserDto dispatcher) {
        System.out.println("AdminController: Received request to create dispatcher: " + dispatcher);
        return ResponseEntity.ok(dispatcherService.create(dispatcher));
    }

    @PutMapping("/dispatchers/{id}")
    ResponseEntity<ResponseUserPublicDto> updateDispatcher(@PathVariable Long id, @RequestBody @Valid UpdateUserDto dispatcherDto) {
        System.out.println("AdminController: Received request to update dispatcher: " + dispatcherDto);
        return ResponseEntity.ok(dispatcherService.update(id, dispatcherDto));
    }

    @DeleteMapping("/dispatchers/{id}")
    ResponseEntity<String> deleteDispatcher(@PathVariable Long id){
        dispatcherService.delete(id);
        return ResponseEntity.ok("Dispatcher deleted successfully");
    }

    @GetMapping("/dispatchers/list")
    ResponseEntity<List<ResponseUserPublicDto>> getDispatcherList() {
        return ResponseEntity.ok(dispatcherService.getAllDispatchers());
    }

    @PostMapping("/drivers")
    ResponseEntity<?> createDriver(@RequestBody @Valid CreateUserDto driver, @PathVariable String id) {
        System.out.println("AdminController: Received request to create driver: " + driver);
        return ResponseEntity.ok(driverService.create(driver));
    }


    @PutMapping("/customers/{id}")
    ResponseEntity<?> updateCustomer(@PathVariable Long id, @RequestBody @Valid UpdateCustomerDto customer) {
        System.out.println("AdminController: Received request to update customer: " + customer);
        return ResponseEntity.ok(customerService.updateCustomer(id, customer));
    }

    @DeleteMapping("/customers/{id}")
    ResponseEntity<?> updateCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok("Customer deleted successfully");
    }

    @GetMapping("/customers/list")
    ResponseEntity<?> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/users/list")
    ResponseEntity<List<ResponseUserPublicDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }


}

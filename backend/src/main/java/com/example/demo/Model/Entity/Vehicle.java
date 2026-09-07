package com.example.demo.Model.Entity;

import com.example.demo.Model.Entity.Enums.VehicleType;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@Table
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType type = VehicleType.MOTORCYCLE;


    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String model;

    @OneToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;
}
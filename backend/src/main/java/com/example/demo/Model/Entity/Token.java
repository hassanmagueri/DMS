package com.example.demo.Model.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.LocalDate;
import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "tokens")
public class Token {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long Id;
//
//    LocalDateTime expiresAt;
//
//    LocalDateTime validateAt;

    @Column(unique = true)
    private String token;

    private Boolean revoked;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    @CreationTimestamp
    LocalDate createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    LocalDate lastModifiedDate;

    @ManyToOne
    User user;

}

package com.carrental.repository;

import com.carrental.model.Rental;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findAllByOrderByIdDesc();
    boolean existsByCustomer_Id(Long customerId);
    boolean existsByCar_Id(Long carId);
    boolean existsByCar_IdAndStatusIn(Long carId, Collection<String> statuses);
    boolean existsByCar_IdAndIdNotAndStatusIn(Long carId, Long rentalId, Collection<String> statuses);

    /** Serialize concurrent status transitions for the same rental record. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select rental from Rental rental where rental.id = :id")
    Optional<Rental> findByIdForUpdate(@Param("id") Long id);
}

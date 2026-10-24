package com.carrental.repository;

import com.carrental.model.Rental;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findAllByOrderByIdDesc();
    boolean existsByCustomer_Id(Long customerId);
    boolean existsByCar_Id(Long carId);
    boolean existsByCar_IdAndStatusIn(Long carId, Collection<String> statuses);
    boolean existsByCar_IdAndIdNotAndStatusIn(Long carId, Long rentalId, Collection<String> statuses);
}

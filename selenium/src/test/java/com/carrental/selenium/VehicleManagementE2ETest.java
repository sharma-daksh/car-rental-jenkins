package com.carrental.selenium;

import java.time.Duration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.Alert;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Local Selenium tests for the React vehicle-management screen.
 * Requires the Spring Boot demo API on port 8081 and Vite on port 5173.
 */
class VehicleManagementE2ETest {

    private static final String BASE_URL =
            System.getProperty("app.baseUrl", "http://127.0.0.1:5173");

    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments(
                "--headless=new",
                "--window-size=1440,1100",
                "--disable-gpu"
        );

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ZERO);
        wait = new WebDriverWait(driver, Duration.ofSeconds(20));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    void dashboardLoadsAndConnectsToTheApi() {
        driver.get(BASE_URL);

        WebElement heading = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector("h1")
                )
        );

        assertEquals("Drive your next adventure.", heading.getText().replaceAll("\\s+", " ").trim());

        WebElement connection = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector(".connection-pill.online")
                )
        );

        assertTrue(
                connection.getText().contains("API connected"),
                "Dashboard should report that the car API is connected."
        );
    }

    @Test
    void vehicleCanBeAddedSearchedEditedAndDeleted() {
        driver.get(BASE_URL);

        // Verify the landing page has loaded.
        wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector("h1")
                )
        );

        // Open the Vehicles page before performing vehicle operations.
        wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[.//span[normalize-space()='Vehicles']]")
                )
        ).click();

        String registration = "SEL" + System.currentTimeMillis();
        String initialModel = "AutomationCar";
        String updatedModel = "AutomationEdited";

        // Add a disposable test vehicle.
        wait.until(
                ExpectedConditions.elementToBeClickable(
                        By.xpath("//button[normalize-space()='Add vehicle']")
                )
        ).click();

        WebElement dialog = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector("section[role='dialog']")
                )
        );

        dialog.findElement(
                By.cssSelector("input[placeholder='e.g. Hyundai']")
        ).sendKeys("SeleniumTest");

        dialog.findElement(
                By.cssSelector("input[placeholder='e.g. Creta']")
        ).sendKeys(initialModel);

        dialog.findElement(
                By.cssSelector("input[placeholder='e.g. MH 02 AB 1234']")
        ).sendKeys(registration);

        dialog.findElement(
                By.cssSelector("input[placeholder='e.g. 2500']")
        ).sendKeys("2500");

        new Select(
                dialog.findElement(
                        By.xpath(".//label[.//span[contains(normalize-space(.), 'Fuel type')]]//select")
                )
        ).selectByVisibleText("Petrol");

        new Select(
                dialog.findElement(
                        By.xpath(".//label[.//span[contains(normalize-space(.), 'Availability status')]]//select")
                )
        ).selectByValue("AVAILABLE");

        dialog.findElement(
                By.xpath(".//button[normalize-space()='Add vehicle']")
        ).click();

        wait.until(
                ExpectedConditions.textToBePresentInElementLocated(
                        By.cssSelector("[role='status']"),
                        "Vehicle added to your fleet."
                )
        );

        // Search for the uniquely identified test vehicle.
        WebElement search = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector("input[placeholder='Search by vehicle or plate']")
                )
        );

        search.sendKeys(registration);

        By testRow = By.xpath("//tr[contains(., '" + registration + "')]");

        wait.until(
                ExpectedConditions.visibilityOfElementLocated(testRow)
        );

        assertTrue(
                driver.findElement(testRow).getText()
                        .contains("SeleniumTest " + initialModel)
        );

        // Edit the test vehicle.
        search.clear();

        WebElement row = wait.until(
                ExpectedConditions.visibilityOfElementLocated(testRow)
        );

        row.findElement(
                By.cssSelector(
                        "button[aria-label='Edit SeleniumTest " + initialModel + "']"
                )
        ).click();

        dialog = wait.until(
                ExpectedConditions.visibilityOfElementLocated(
                        By.cssSelector("section[role='dialog']")
                )
        );

        WebElement modelInput = dialog.findElement(
                By.cssSelector("input[placeholder='e.g. Creta']")
        );

        modelInput.clear();
        modelInput.sendKeys(updatedModel);

        dialog.findElement(
                By.xpath(".//button[normalize-space()='Save changes']")
        ).click();

        wait.until(
                ExpectedConditions.textToBePresentInElementLocated(
                        By.cssSelector("[role='status']"),
                        "Vehicle updated successfully."
                )
        );

        By updatedRow = By.xpath("//tr[contains(., '" + registration + "')]");

        wait.until(
                ExpectedConditions.textToBePresentInElementLocated(
                        updatedRow,
                        updatedModel
                )
        );

        // Delete only the vehicle created by this test.
        driver.findElement(updatedRow).findElement(
                By.cssSelector(
                        "button[aria-label='Delete SeleniumTest " + updatedModel + "']"
                )
        ).click();

        Alert confirmation = wait.until(
                ExpectedConditions.alertIsPresent()
        );

        confirmation.accept();

        wait.until(
                ExpectedConditions.invisibilityOfElementLocated(updatedRow)
        );
    }
}

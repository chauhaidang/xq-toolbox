Feature: Harness dogfood
  Scenario: Mock health endpoint
    When I request the health endpoint
    Then the response is OK

Feature: Consumer smoke
  Scenario: Health via harness only
    When I request the health endpoint
    Then the response is OK

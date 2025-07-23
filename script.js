// Define your backend API URL - Hardcoded as requested
const BACKEND_API_URL = 'https://smart-fund-backend-api.onrender.com/calculate-allocation';

// Get references to DOM elements
// Inputs
const loanAmountInput = document.getElementById('loanAmount');
const loanAmountSlider = document.getElementById('loanAmountSlider');
const monthlyBudgetInput = document.getElementById('monthlyBudget');
const monthlyBudgetSlider = document.getElementById('monthlyBudgetSlider');
const loanInterestRateDisplay = document.getElementById('loanInterestRateDisplay');
const loanInterestRateSlider = document.getElementById('loanInterestRateSlider');
const loanTenureDisplay = document.getElementById('loanTenureDisplay');
const loanTenureSlider = document.getElementById('loanTenureSlider');
const riskAppetiteDisplay = document.getElementById('riskAppetiteDisplay');
const riskAppetiteSlider = document.getElementById('riskAppetiteSlider');
const investmentTenureDisplay = document.getElementById('investmentTenureDisplay');
const investmentTenureSlider = document.getElementById('investmentTenureSlider');
const optimizationPeriodDisplay = document.getElementById('optimizationPeriodDisplay'); // Corrected ID
const optimizationPeriodSlider = document.getElementById('optimizationPeriodSlider');
const optimizationPeriodContainer = document.getElementById('optimizationPeriodContainer');

// Goal Selection Buttons
const btnNetZeroInterest = document.getElementById('btnNetZeroInterest');
const btnMinTimeNetZero = document.getElementById('btnMinTimeNetZero');
const btnMaxGrowth = document.getElementById('btnMaxGrowth');
const goalButtons = [btnNetZeroInterest, btnMinTimeNetZero, btnMaxGrowth];

// Output Displays
const emiResult = document.getElementById('emiResult');
const monthlyInvestmentResult = document.getElementById('monthlyInvestmentResult');
const totalInterestResult = document.getElementById('totalInterestResult');
const investmentFutureValueResult = document.getElementById('investmentFutureValueResult');
const minTimeContainer = document.getElementById('minTimeContainer');
const minTimeResult = document.getElementById('minTimeResult');
const netWealthContainer = document.getElementById('netWealthContainer');
const netWealthResult = document.getElementById('netWealthResult');
const guidanceAlert = document.getElementById('guidanceAlert');
const alertMessage = document.getElementById('alertMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsDisplay = document.getElementById('resultsDisplay'); // Container for key metrics

// Charts
const monthlyBudgetChartCanvas = document.getElementById('monthlyBudgetChart');
const comparisonChartCanvas = document.getElementById('comparisonChart');
const monthlyBudgetChartMessage = document.getElementById('monthlyBudgetChartMessage');
const comparisonChartMessage = document.getElementById('comparisonChartMessage');

// Chart instances (to destroy and re-create)
let monthlyBudgetChartInstance;
let comparisonChartInstance; // This will handle both bar and line charts

// Current selected allocation goal
let currentAllocationGoal = 'netZeroInterest'; // Default goal

// --- Event Listeners for Sliders and Inputs ---
function setupSliderInputBinding(slider, input) {
    // Add null checks for robustness
    if (!slider || !input) {
        console.warn('Skipping slider setup: one or both elements are null.', { slider, input });
        return; // Exit if elements are not found
    }

    slider.addEventListener('input', () => {
        input.value = slider.value;
        updateSliderProgress(slider);
    });
    input.addEventListener('input', () => {
        // Ensure input value is within slider's min/max
        let value = parseFloat(input.value);
        if (isNaN(value)) value = parseFloat(input.min); // Use parseFloat for min/max
        if (value < parseFloat(input.min)) value = parseFloat(input.min);
        if (value > parseFloat(input.max)) value = parseFloat(input.max);
        input.value = value;
        slider.value = value;
        updateSliderProgress(slider);
    });
    // Initial update for slider progress
    updateSliderProgress(slider);
}

function updateSliderProgress(slider) {
    // Add null check for robustness
    if (!slider) {
        console.warn('Skipping slider progress update: slider element is null.');
        return;
    }
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const value = parseFloat(slider.value);
    const progress = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--range-progress', `${progress}%`);
}

// Call setupSliderInputBinding only if elements exist
if (loanAmountSlider && loanAmountInput) setupSliderInputBinding(loanAmountSlider, loanAmountInput);
if (monthlyBudgetSlider && monthlyBudgetInput) setupSliderInputBinding(monthlyBudgetSlider, monthlyBudgetInput);
if (loanInterestRateSlider && loanInterestRateDisplay) setupSliderInputBinding(loanInterestRateSlider, loanInterestRateDisplay);
if (loanTenureSlider && loanTenureDisplay) setupSliderInputBinding(loanTenureSlider, loanTenureDisplay);
if (riskAppetiteSlider && riskAppetiteDisplay) setupSliderInputBinding(riskAppetiteSlider, riskAppetiteDisplay);
if (investmentTenureSlider && investmentTenureDisplay) setupSliderInputBinding(investmentTenureSlider, investmentTenureDisplay);
if (optimizationPeriodSlider && optimizationPeriodDisplay) setupSliderInputBinding(optimizationPeriodSlider, optimizationPeriodDisplay);


// --- Goal Selection Logic ---
goalButtons.forEach(button => {
    // Add null check for button
    if (!button) {
        console.warn('Skipping goal button setup: button element is null.');
        return;
    }
    button.addEventListener('click', () => {
        // Remove 'selected' class from all buttons
        goalButtons.forEach(btn => {
            if (btn) btn.classList.remove('selected');
        });
        // Add 'selected' class to the clicked button
        button.classList.add('selected');
        // Update the current allocation goal
        currentAllocationGoal = button.dataset.goal;

        // Toggle visibility of Optimization Period
        if (optimizationPeriodContainer) { // Add null check
            if (currentAllocationGoal === 'maximizeGrowth') {
                optimizationPeriodContainer.classList.remove('hidden');
            } else {
                optimizationPeriodContainer.classList.add('hidden');
            }
        }

        // Reset results and charts visibility
        if (resultsDisplay) resultsDisplay.classList.add('hidden');
        if (guidanceAlert) guidanceAlert.classList.add('hidden');
        if (monthlyBudgetChartCanvas) monthlyBudgetChartCanvas.classList.add('hidden');
        if (comparisonChartCanvas) comparisonChartCanvas.classList.add('hidden');
        if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.remove('hidden');
        if (comparisonChartMessage) comparisonChartMessage.classList.remove('hidden');

        // Clear previous chart instances
        if (monthlyBudgetChartInstance) monthlyBudgetChartInstance.destroy();
        if (comparisonChartInstance) comparisonChartInstance.destroy();
    });
});

// Set initial selected goal button
if (btnNetZeroInterest) btnNetZeroInterest.classList.add('selected');


// --- Main Calculation Trigger ---
const calculateBtn = document.getElementById('calculateBtn');
if (calculateBtn) { // Add null check for the button itself
    calculateBtn.addEventListener('click', async () => {
        // Collect user inputs from the display fields (which are linked to sliders)
        const loanAmount = parseFloat(loanAmountInput.value);
        const monthlyBudget = parseFloat(monthlyBudgetInput.value);
        const loanInterestRate = parseFloat(loanInterestRateDisplay.value);
        const loanTenure = parseFloat(loanTenureDisplay.value);
        const investmentTenure = parseFloat(investmentTenureDisplay.value);
        const riskAppetite = parseFloat(riskAppetiteDisplay.value); // Now a number (percentage)
        const optimizationPeriod = parseFloat(optimizationPeriodDisplay.value); // Only relevant for Maximize Growth

        // Basic client-side validation
        if (isNaN(loanAmount) || loanAmount <= 0 ||
            isNaN(monthlyBudget) || monthlyBudget <= 0 ||
            isNaN(loanInterestRate) || loanInterestRate <= 0 ||
            isNaN(loanTenure) || loanTenure <= 0 ||
            isNaN(investmentTenure) || investmentTenure <= 0 ||
            isNaN(riskAppetite) || riskAppetite <= 0) {
            displayMessage('Please enter valid positive numbers for all financial inputs.', 'danger');
            return;
        }

        // Prepare data for API request
        const requestData = {
            loan_amount: loanAmount,
            monthly_budget: monthlyBudget,
            loan_interest_rate: loanInterestRate,
            loan_tenure_years: loanTenure,
            investment_tenure_years: investmentTenure,
            risk_appetite: riskAppetite, // Send as percentage
            allocation_goal: currentAllocationGoal
        };

        // Add optimization period if applicable
        if (currentAllocationGoal === 'maximizeGrowth') {
            requestData.optimization_period_years = optimizationPeriod;
        }

        try {
            // Show loading indicator
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            if (guidanceAlert) guidanceAlert.classList.add('hidden'); // Hide previous alert
            if (resultsDisplay) resultsDisplay.classList.add('hidden'); // Hide results while loading
            if (monthlyBudgetChartCanvas) monthlyBudgetChartCanvas.classList.add('hidden');
            if (comparisonChartCanvas) comparisonChartCanvas.classList.add('hidden');
            if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.add('hidden');
            if (comparisonChartMessage) comparisonChartMessage.classList.add('hidden');


            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });

            if (loadingIndicator) loadingIndicator.classList.add('hidden'); // Hide loading indicator

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            console.log("API Response:", result); // For debugging

            // Update results display
            if (emiResult) emiResult.textContent = `₹${result.monthly_emi.toFixed(2)}`;
            if (monthlyInvestmentResult) monthlyInvestmentResult.textContent = `₹${result.monthly_investment.toFixed(2)}`;
            if (totalInterestResult) totalInterestResult.textContent = `₹${result.total_loan_interest_payable.toFixed(2)}`;
            if (investmentFutureValueResult) investmentFutureValueResult.textContent = `₹${result.estimated_investment_future_value.toFixed(2)}`;

            // Handle goal-specific outputs visibility
            if (minTimeContainer) minTimeContainer.classList.add('hidden');
            if (netWealthContainer) netWealthContainer.classList.add('hidden');

            if (currentAllocationGoal === 'maximizeGrowth' && result.net_wealth_at_end !== null) {
                if (netWealthContainer) netWealthContainer.classList.remove('hidden');
                if (netWealthResult) netWealthResult.textContent = `₹${result.net_wealth_at_end.toFixed(2)}`;
            } else if (currentAllocationGoal === 'minimumTime' && result.minimum_time_to_net_zero !== null) {
                if (minTimeContainer) minTimeContainer.classList.remove('hidden');
                if (minTimeResult) minTimeResult.textContent = `${result.minimum_time_to_net_zero} Years`;
            }

            // Show results and charts sections
            if (resultsDisplay) resultsDisplay.classList.remove('hidden');
            if (monthlyBudgetChartCanvas) monthlyBudgetChartCanvas.classList.remove('hidden');
            if (comparisonChartCanvas) comparisonChartCanvas.classList.remove('hidden');
            if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.add('hidden'); // Hide message as chart will load
            if (comparisonChartMessage) comparisonChartMessage.classList.add('hidden'); // Hide message as chart will load

            // Update guidance message
            displayMessage(result.guidance_message, result.status);

            // Render charts
            renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate);

        } catch (error) {
            console.error('Error fetching data:', error);
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            displayMessage(`Error: ${error.message}. Please try again or check your inputs.`, 'danger');
            if (resultsDisplay) resultsDisplay.classList.add('hidden'); // Hide results on error
            if (monthlyBudgetChartCanvas) monthlyBudgetChartCanvas.classList.add('hidden');
            if (comparisonChartCanvas) comparisonChartCanvas.classList.add('hidden');
            if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.remove('hidden'); // Show message if chart fails
            if (comparisonChartMessage) comparisonChartMessage.classList.remove('hidden'); // Show message if chart fails
        }
    });
}


// Function to display messages (replaces alert())
function displayMessage(message, type) {
    if (alertMessage) alertMessage.textContent = message;
    if (guidanceAlert) {
        guidanceAlert.classList.remove('hidden', 'alert-success', 'alert-warning', 'alert-danger'); // Reset classes
        if (type === 'success') {
            guidanceAlert.classList.add('alert-success');
        } else if (type === 'warning') {
            guidanceAlert.classList.add('alert-warning');
        } else if (type === 'error' || type === 'danger') { // Use 'danger' for errors
            guidanceAlert.classList.add('alert-danger');
        }
    }
}


// Function to render all charts
function renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate) {
    // Destroy previous chart instances to prevent duplicates
    if (monthlyBudgetChartInstance) monthlyBudgetChartInstance.destroy();
    if (comparisonChartInstance) comparisonChartInstance.destroy();

    // --- 1. Monthly Budget Pie Chart ---
    if (monthlyBudgetChartCanvas) { // Add null check for canvas
        const budgetPieCtx = monthlyBudgetChartCanvas.getContext('2d');
        let remainingBudget = monthlyBudget - result.monthly_emi - result.monthly_investment;
        if (remainingBudget < 0) remainingBudget = 0; // Cap at 0 if over budget

        const pieData = {
            labels: ['Monthly EMI', 'Monthly Investment', 'Remaining Budget'],
            datasets: [{
                data: [
                    result.monthly_emi,
                    result.monthly_investment,
                    remainingBudget
                ],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)', // primary color from tailwind.config
                    'rgba(34, 197, 94, 0.8)', // success color from tailwind.config
                    'rgba(156, 163, 175, 0.8)' // gray-400 from tailwind.config
                ],
                hoverOffset: 4
            }]
        };
        monthlyBudgetChartInstance = new Chart(budgetPieCtx, {
            type: 'pie',
            data: pieData,
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow canvas to fill container
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Monthly Budget Allocation'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += `₹${context.parsed.y.toFixed(2)}`; // Changed to y for consistency, though pie chart uses value
                                }
                                return label;
                            }
                        }
                    }
                }
            },
        });
    }


    // --- 2. Visual Comparison Chart (Bar or Line based on goal) ---
    if (comparisonChartCanvas) { // Add null check for canvas
        const comparisonCtx = comparisonChartCanvas.getContext('2d');

        if (currentAllocationGoal === 'netZeroInterest' || currentAllocationGoal === 'maximizeGrowth') {
            // Bar Chart for Interest vs. Gain
            const barData = {
                labels: ['Total Loan Interest', 'Estimated Investment Gain'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [result.total_loan_interest_payable, result.estimated_investment_future_value],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)', // danger color from tailwind.config
                        'rgba(34, 197, 94, 0.8)' // success color from tailwind.config
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 1
                }]
            };
            comparisonChartInstance = new Chart(comparisonCtx, {
                type: 'bar',
                data: barData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Total Loan Interest vs. Estimated Investment Gain'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += `₹${context.parsed.y.toFixed(2)}`;
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)'
                            }
                        }
                    }
                },
            });
        } else if (currentAllocationGoal === 'minimumTime') {
            // Line Chart for Investment Growth vs. Loan Balance Over Time
            const years = Array.from({ length: loanTenure + 1 }, (_, i) => i);
            const loanBalanceData = [loanAmount]; // Starting balance
            const investmentGrowthData = [0]; // Starting investment value

            let currentLoanBalance = loanAmount;
            let currentInvestmentValue = 0;
            const monthlyLoanRate = (loanInterestRate / 100) / 12;
            const monthlyInvestmentRate = (getInvestmentRate(riskAppetite) / 100) / 12; // Use passed riskAppetite (now a number)
            const currentMonthlyEMI = result.monthly_emi;
            const currentMonthlyInvestment = result.monthly_investment;

            for (let i = 1; i <= loanTenure; i++) {
                // Approximate annual loan balance
                // This is a simplification; a true amortization schedule from backend is better
                const remainingMonths = (loanTenure - i + 1) * 12;
                if (remainingMonths > 0) {
                     // Calculate remaining balance using PV formula for remaining payments
                     currentLoanBalance = currentMonthlyEMI * (1 - Math.pow(1 + monthlyLoanRate, -remainingMonths)) / monthlyLoanRate;
                } else {
                    currentLoanBalance = 0; // Loan paid off
                }
                loanBalanceData.push(Math.max(0, currentLoanBalance)); // Ensure non-negative

                // Approximate annual investment growth (future value of annuity)
                const totalInvestedMonths = i * 12;
                currentInvestmentValue = currentMonthlyInvestment * ((Math.pow(1 + monthlyInvestmentRate, totalInvestedMonths) - 1) / monthlyInvestmentRate);
                investmentGrowthData.push(currentInvestmentValue);
            }

            const lineData = {
                labels: years,
                datasets: [
                    {
                        label: 'Loan Balance',
                        data: loanBalanceData,
                        borderColor: 'rgba(79, 70, 229, 0.8)', // Primary color
                        backgroundColor: 'rgba(79, 70, 229, 0.5)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Investment Value',
                        data: investmentGrowthData,
                        borderColor: 'rgba(34, 197, 94, 0.8)', // Success color
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        tension: 0.1,
                        fill: false
                    }
                ]
            };
            comparisonChartInstance = new Chart(comparisonCtx, {
                type: 'line',
                data: lineData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Investment Growth vs. Loan Balance Over Time'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += `₹${context.parsed.y.toFixed(2)}`;
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)'
                            }
                        }
                    }
                },
            });
        }
    }
}

// Helper function to get the expected annual return based on risk appetite percentage
// (This should ideally align with what your backend uses)
function getInvestmentRate(riskAppetitePercentage) {
    // Assuming riskAppetitePercentage is directly the annual percentage (e.g., 6, 10, 14)
    // You can map ranges if needed, but for now, it's a direct pass-through
    return riskAppetitePercentage;
}

// Initial state: hide results and charts, show messages
loadingIndicator.classList.add('hidden');
resultsDisplay.classList.add('hidden');
guidanceAlert.classList.add('hidden');
monthlyBudgetChartCanvas.classList.add('hidden');
comparisonChartCanvas.classList.add('hidden');
monthlyBudgetChartMessage.classList.remove('hidden');
comparisonChartMessage.classList.remove('hidden');

// Ensure initial slider progress is set
// These dispatches will now be handled by the null-checked setupSliderInputBinding
// if the elements are found. If not, the console.warn will indicate which ones.
loanAmountSlider.dispatchEvent(new Event('input'));
monthlyBudgetSlider.dispatchEvent(new Event('input'));
loanInterestRateSlider.dispatchEvent(new Event('input'));
loanTenureSlider.dispatchEvent(new Event('input'));
riskAppetiteSlider.dispatchEvent(new Event('input'));
investmentTenureSlider.dispatchEvent(new Event('input'));
optimizationPeriodSlider.dispatchEvent(new Event('input'));

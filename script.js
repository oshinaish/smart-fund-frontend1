// Define your backend API URL - Hardcoded as requested
const BASE_BACKEND_API_URL = 'https://smart-fund-backend-api.onrender.com/api'; // Base URL for all API endpoints

// Global variables for DOM elements and Chart instances (initialized in DOMContentLoaded)
// These variables are declared globally but will be assigned values inside DOMContentLoaded
let loanAmountInput, loanAmountSlider, monthlyBudgetInput, monthlyBudgetSlider;
let loanInterestRateDisplay, loanInterestRateSlider, loanTenureDisplay, loanTenureSlider;
let riskAppetiteDisplay, riskAppetiteSlider, investmentTenureDisplay, investmentTenureSlider; // Changed riskAppetiteSelect back to riskAppetiteDisplay
let optimizationPeriodDisplay, optimizationPeriodSlider, optimizationPeriodContainer;
let btnNetZeroInterest, btnMinTimeNetZero, btnMaxGrowth, goalButtons;
let emiResult, monthlyInvestmentResult, totalInterestResult, investmentFutureValueResult;
let minTimeContainer, minTimeResult, netWealthContainer, netWealthResult;
let guidanceAlert, alertMessage, loadingIndicator, resultsDisplay;
// Removed global canvas variables as they will be fetched inside renderCharts

let monthlyBudgetChartInstance;
let comparisonChartInstance;
let currentAllocationGoal = 'net-zero-interest'; // Default goal, matching backend path suffix

// --- DOMContentLoaded ensures all HTML is loaded before script runs ---
document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    // All document.getElementById calls are now safely inside DOMContentLoaded
    // Inputs
    loanAmountInput = document.getElementById('loanAmount');
    loanAmountSlider = document.getElementById('loanAmountSlider');
    monthlyBudgetInput = document.getElementById('monthlyBudget');
    monthlyBudgetSlider = document.getElementById('monthlyBudgetSlider');
    loanInterestRateDisplay = document.getElementById('loanInterestRateDisplay');
    loanInterestRateSlider = document.getElementById('loanInterestRateSlider');
    loanTenureDisplay = document.getElementById('loanTenureDisplay');
    loanTenureSlider = document.getElementById('loanTenureSlider');
    riskAppetiteDisplay = document.getElementById('riskAppetiteDisplay'); // Changed back to riskAppetiteDisplay
    riskAppetiteSlider = document.getElementById('riskAppetiteSlider'); // Re-added slider for risk appetite
    investmentTenureDisplay = document.getElementById('investmentTenureDisplay');
    investmentTenureSlider = document.getElementById('investmentTenureSlider');
    optimizationPeriodDisplay = document.getElementById('optimizationPeriodDisplay');
    optimizationPeriodSlider = document.getElementById('optimizationPeriodSlider');
    optimizationPeriodContainer = document.getElementById('optimizationPeriodContainer');

    // Goal Selection Buttons
    btnNetZeroInterest = document.getElementById('btnNetZeroInterest');
    btnMinTimeNetZero = document.getElementById('btnMinTimeNetZero');
    btnMaxGrowth = document.getElementById('btnMaxGrowth');
    goalButtons = [btnNetZeroInterest, btnMinTimeNetZero, btnMaxGrowth];

    // Output Displays
    emiResult = document.getElementById('emiResult');
    monthlyInvestmentResult = document.getElementById('monthlyInvestmentResult');
    totalInterestResult = document.getElementById('totalInterestResult');
    investmentFutureValueResult = document.getElementById('investmentFutureValueResult');
    minTimeContainer = document.getElementById('minTimeContainer');
    minTimeResult = document.getElementById('minTimeResult');
    netWealthContainer = document.getElementById('netWealthContainer');
    netWealthResult = document.getElementById('netWealthResult');
    guidanceAlert = document.getElementById('guidanceAlert');
    alertMessage = document.getElementById('alertMessage');
    loadingIndicator = document.getElementById('loadingIndicator');
    resultsDisplay = document.getElementById('resultsDisplay');

    // Messages for charts (these are divs, not canvases)
    monthlyBudgetChartMessage = document.getElementById('monthlyBudgetChartMessage');
    comparisonChartMessage = document.getElementById('comparisonChartMessage');


    // --- Event Listeners for Sliders and Inputs ---
    function setupSliderInputBinding(slider, input) {
        if (!slider || !input) {
            console.warn('Skipping slider setup: one or both elements are null.', { slider, input });
            return;
        }

        slider.addEventListener('input', () => {
            input.value = slider.value;
            updateSliderProgress(slider);
        });
        input.addEventListener('input', () => {
            let value = parseFloat(input.value);
            if (isNaN(value)) value = parseFloat(input.min);
            if (value < parseFloat(input.min)) value = parseFloat(input.min);
            if (value > parseFloat(input.max)) value = parseFloat(input.max);
            input.value = value;
            slider.value = value;
            updateSliderProgress(slider);
        });
        updateSliderProgress(slider);
    }

    function updateSliderProgress(slider) {
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
    if (riskAppetiteSlider && riskAppetiteDisplay) setupSliderInputBinding(riskAppetiteSlider, riskAppetiteDisplay); // Re-added
    if (investmentTenureSlider && investmentTenureDisplay) setupSliderInputBinding(investmentTenureSlider, investmentTenureDisplay);
    if (optimizationPeriodSlider && optimizationPeriodDisplay) setupSliderInputBinding(optimizationPeriodSlider, optimizationPeriodDisplay);


    // --- Goal Selection Logic ---
    goalButtons.forEach(button => {
        if (!button) {
            console.warn('Skipping goal button setup: button element is null.');
            return;
        }
        button.addEventListener('click', () => {
            goalButtons.forEach(btn => {
                if (btn) btn.classList.remove('selected');
            });
            button.classList.add('selected');
            currentAllocationGoal = button.dataset.goal; // Get goal from data-goal attribute

            if (optimizationPeriodContainer) {
                if (currentAllocationGoal === 'max-growth') { // Use 'max-growth'
                    optimizationPeriodContainer.classList.remove('hidden');
                } else {
                    optimizationPeriodContainer.classList.add('hidden');
                }
            }

            if (resultsDisplay) resultsDisplay.classList.add('hidden');
            if (guidanceAlert) guidanceAlert.classList.add('hidden');
            // Hide chart canvases and show messages initially
            const mbChart = document.getElementById('monthlyBudgetChart');
            const compChart = document.getElementById('comparisonChart');
            if (mbChart) mbChart.classList.add('hidden');
            if (compChart) compChart.classList.add('hidden');
            if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.remove('hidden');
            if (comparisonChartMessage) comparisonChartMessage.classList.remove('hidden');

            if (monthlyBudgetChartInstance) monthlyBudgetChartInstance.destroy();
            if (comparisonChartInstance) comparisonChartInstance.destroy();
        });
    });

    if (btnNetZeroInterest) btnNetZeroInterest.classList.add('selected'); // Set initial selected goal button


    // --- Main Calculation Trigger ---
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', async () => {
            // Collect user inputs from the display fields (which are linked to sliders)
            // Add null checks before accessing .value
            const loanAmount = parseFloat(loanAmountInput ? loanAmountInput.value : 0);
            const monthlyBudget = parseFloat(monthlyBudgetInput ? monthlyBudgetInput.value : 0);
            const loanInterestRate = parseFloat(loanInterestRateDisplay ? loanInterestRateDisplay.value : 0);
            const loanTenure = parseFloat(loanTenureDisplay ? loanTenureDisplay.value : 0);
            const investmentTenure = parseFloat(investmentTenureDisplay ? investmentTenureDisplay.value : 0);
            const riskAppetite = parseFloat(riskAppetiteDisplay ? riskAppetiteDisplay.value : 0); // Get numeric value directly
            const optimizationPeriod = parseFloat(optimizationPeriodDisplay ? optimizationPeriodDisplay.value : 0);

            // Validate numeric inputs only
            if (isNaN(loanAmount) || loanAmount <= 0 ||
                isNaN(monthlyBudget) || monthlyBudget <= 0 ||
                isNaN(loanInterestRate) || loanInterestRate <= 0 ||
                isNaN(loanTenure) || loanTenure <= 0 ||
                isNaN(investmentTenure) || investmentTenure <= 0 ||
                isNaN(riskAppetite) || riskAppetite <= 0) { // Keep riskAppetite validation as numeric
                displayMessage('Please enter valid positive numbers for all financial inputs.', 'danger');
                return;
            }

            const API_ENDPOINT = `${BASE_BACKEND_API_URL}/calculate-${currentAllocationGoal}`;

            const requestData = {
                loan_amount: loanAmount,
                monthly_budget: monthlyBudget,
                loan_interest_rate: loanInterestRate,
                loan_tenure_years: loanTenure,
                investment_tenure_years: investmentTenure,
                risk_appetite: riskAppetite, // Send as number
                allocation_goal: currentAllocationGoal // Still send this for backend logic if needed
            };

            // Add optimization period if applicable
            if (currentAllocationGoal === 'max-growth') { // Use 'max-growth'
                requestData.optimization_period_years = optimizationPeriod;
            }

            try {
                if (loadingIndicator) loadingIndicator.classList.remove('hidden');
                if (guidanceAlert) guidanceAlert.classList.add('hidden');
                if (resultsDisplay) resultsDisplay.classList.add('hidden');
                // Hide chart canvases and show messages during loading
                const mbChart = document.getElementById('monthlyBudgetChart');
                const compChart = document.getElementById('comparisonChart');
                if (mbChart) mbChart.classList.add('hidden');
                if (compChart) compChart.classList.add('hidden');
                if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.add('hidden');
                if (comparisonChartMessage) comparisonChartMessage.classList.add('hidden');


                const response = await fetch(API_ENDPOINT, { // Use the dynamically constructed API_ENDPOINT
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                if (loadingIndicator) loadingIndicator.classList.add('hidden');

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();
                console.log("API Response:", result);

                if (emiResult) emiResult.textContent = `₹${result.monthlyEMI.toFixed(2)}`; // Backend uses monthlyEMI
                if (monthlyInvestmentResult) monthlyInvestmentResult.textContent = `₹${result.monthlyInvestment.toFixed(2)}`; // Backend uses monthlyInvestment
                if (totalInterestResult) totalInterestResult.textContent = `₹${result.totalLoanInterestPayable.toFixed(2)}`; // Backend uses totalLoanInterestPayable
                if (investmentFutureValueResult) investmentFutureValueResult.textContent = `₹${result.estimatedInvestmentFutureValue.toFixed(2)}`; // Backend uses estimatedInvestmentFutureValue

                minTimeContainer.classList.add('hidden');
                netWealthContainer.classList.add('hidden');

                if (currentAllocationGoal === 'max-growth' && result.netWealthAtPeriodEnd !== null) { // Use 'max-growth' and netWealthAtPeriodEnd
                    if (netWealthContainer) netWealthContainer.classList.remove('hidden');
                    if (netWealthResult) netWealthResult.textContent = `₹${result.netWealthAtPeriodEnd.toFixed(2)}`;
                } else if (currentAllocationGoal === 'min-time-net-zero' && result.minTimeYears !== null) { // Use 'min-time-net-zero' and minTimeYears
                    if (minTimeContainer) minTimeContainer.classList.remove('hidden');
                    if (minTimeResult) minTimeResult.textContent = `${result.minTimeYears} Years`;
                }

                if (resultsDisplay) resultsDisplay.classList.remove('hidden');
                // Show chart canvases and hide messages after successful calculation
                if (mbChart) mbChart.classList.remove('hidden');
                if (compChart) compChart.classList.remove('hidden');
                if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.add('hidden');
                if (comparisonChartMessage) comparisonChartMessage.classList.add('hidden');

                displayMessage(result.guidanceMessage, result.status); // Backend uses guidanceMessage

                // Render charts - now fetching canvases inside the function
                // Pass the original numeric riskAppetite for getInvestmentRate
                renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate, riskAppetite);

            } catch (error) {
                console.error('Error fetching data:', error);
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                displayMessage(`Error: ${error.message}. Please try again or check your inputs.`, 'danger');
                if (resultsDisplay) resultsDisplay.classList.add('hidden');
                // Hide chart canvases and show messages on error
                const mbChart = document.getElementById('monthlyBudgetChart');
                const compChart = document.getElementById('comparisonChart');
                if (mbChart) mbChart.classList.add('hidden');
                if (compChart) compChart.classList.add('hidden');
                if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.remove('hidden');
                if (comparisonChartMessage) comparisonChartMessage.classList.remove('hidden');
            }
        });
    }


    // Function to display messages (replaces alert())
    function displayMessage(message, type) {
        if (alertMessage) alertMessage.textContent = message;
        if (guidanceAlert) {
            guidanceAlert.classList.remove('hidden', 'alert-success', 'alert-warning', 'alert-danger');
            if (type === 'success') {
                guidanceAlert.classList.add('alert-success');
            } else if (type === 'warning') {
                guidanceAlert.classList.add('alert-warning');
            } else if (type === 'error' || type === 'danger') {
                guidanceAlert.classList.add('alert-danger');
            }
        }
    }


    // Function to render all charts
    function renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate, riskAppetiteNumericForChart) {
        // Fetch canvas elements directly within renderCharts to ensure they are available
        const monthlyBudgetChartCanvas = document.getElementById('monthlyBudgetChart');
        const comparisonChartCanvas = document.getElementById('comparisonChart');

        // Destroy previous chart instances to prevent duplicates
        if (monthlyBudgetChartInstance) monthlyBudgetChartInstance.destroy();
        if (comparisonChartInstance) comparisonChartInstance.destroy();

        // --- 1. Monthly Budget Pie Chart ---
        if (monthlyBudgetChartCanvas) {
            const budgetPieCtx = monthlyBudgetChartCanvas.getContext('2d');
            let remainingBudget = monthlyBudget - result.monthlyEMI - result.monthlyInvestment; // Use backend names
            if (remainingBudget < 0) remainingBudget = 0;

            const pieData = {
                labels: ['Monthly EMI', 'Monthly Investment', 'Remaining Budget'],
                datasets: [{
                    data: [
                        result.monthlyEMI, // Use backend names
                        result.monthlyInvestment, // Use backend names
                        remainingBudget
                    ],
                    backgroundColor: [
                        'rgba(79, 70, 229, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(156, 163, 175, 0.8)'
                    ],
                    hoverOffset: 4
                }]
            };
            monthlyBudgetChartInstance = new Chart(budgetPieCtx, {
                type: 'pie',
                data: pieData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
                                        label += `₹${context.parsed.toFixed(2)}`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                },
            });
        } else {
            console.error("Monthly budget chart canvas not found!");
        }


        // --- 2. Visual Comparison Chart (Bar or Line based on goal) ---
        if (comparisonChartCanvas) {
            const comparisonCtx = comparisonChartCanvas.getContext('2d');

            if (currentAllocationGoal === 'net-zero-interest' || currentAllocationGoal === 'max-growth') { // Use backend names
                const barData = {
                    labels: ['Total Loan Interest', 'Estimated Investment Gain'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [result.totalLoanInterestPayable, result.estimatedInvestmentFutureValue], // Use backend names
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(34, 197, 94, 0.8)'
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
            } else if (currentAllocationGoal === 'min-time-net-zero') { // Use backend name
                const years = Array.from({ length: loanTenure + 1 }, (_, i) => i);
                const loanBalanceData = [loanAmount]; // Starting balance
                const investmentGrowthData = [0]; // Starting investment value

                let currentLoanBalance = loanAmount;
                let currentInvestmentValue = 0;
                const monthlyLoanRate = (loanInterestRate / 100) / 12;
                // Use the helper function to get the numeric rate from the numeric riskAppetite
                const monthlyInvestmentRate = (getInvestmentRate(riskAppetiteNumericForChart) / 100) / 12;
                const currentMonthlyEMI = result.monthlyEMI; // Use backend name
                const currentMonthlyInvestment = result.monthlyInvestment; // Use backend name

                for (let i = 1; i <= loanTenure; i++) {
                    const paymentsMade = i * 12;
                    const remainingPayments = (loanTenure * 12) - paymentsMade;

                    if (remainingPayments > 0) {
                        currentLoanBalance = currentMonthlyEMI * (1 - Math.pow(1 + monthlyLoanRate, -remainingPayments)) / monthlyLoanRate;
                    } else {
                        currentLoanBalance = 0;
                    }
                    loanBalanceData.push(Math.max(0, currentLoanBalance));

                    const totalInvestedMonths = i * 12;
                    currentInvestmentValue = currentMonthlyInvestment * ((Math.pow(1 + monthlyInvestmentRate, totalInvestedMonths) - 1) / monthlyInvestmentRate) * (1 + monthlyInvestmentRate);
                    investmentGrowthData.push(currentInvestmentValue);
                }

                const lineData = {
                    labels: years,
                    datasets: [
                        {
                            label: 'Loan Balance',
                            data: loanBalanceData,
                            borderColor: 'rgba(79, 70, 229, 0.8)',
                            backgroundColor: 'rgba(79, 70, 229, 0.5)',
                            tension: 0.1,
                            fill: false
                        },
                        {
                            label: 'Investment Value',
                            data: investmentGrowthData,
                            borderColor: 'rgba(34, 197, 94, 0.8)',
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
        } else {
            console.error("Comparison chart canvas not found!");
        }
    }

    // Helper function to get the expected annual return based on risk appetite numeric value
    // This directly returns the numeric value as it's already a percentage
    function getInvestmentRate(riskAppetiteNumeric) {
        return riskAppetiteNumeric;
    }

    // Initial state: hide results and charts, show messages
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (resultsDisplay) resultsDisplay.classList.add('hidden');
    if (guidanceAlert) guidanceAlert.classList.add('hidden');
    
    // Initial hiding of canvases and showing of messages
    const initialMonthlyBudgetChartCanvas = document.getElementById('monthlyBudgetChart');
    const initialComparisonChartCanvas = document.getElementById('comparisonChart');
    if (initialMonthlyBudgetChartCanvas) initialMonthlyBudgetChartCanvas.classList.add('hidden');
    if (initialComparisonChartCanvas) initialComparisonChartCanvas.classList.add('hidden');
    if (monthlyBudgetChartMessage) monthlyBudgetChartMessage.classList.remove('hidden');
    if (comparisonChartMessage) comparisonChartMessage.classList.remove('hidden');

    // Ensure initial slider progress is set
    // These dispatches will now be handled by the null-checked setupSliderInputBinding
    // if the elements are found. If not, the console.warn will indicate which ones.
    if (loanAmountSlider) loanAmountSlider.dispatchEvent(new Event('input'));
    if (monthlyBudgetSlider) monthlyBudgetSlider.dispatchEvent(new Event('input'));
    if (loanInterestRateSlider) loanInterestRateSlider.dispatchEvent(new Event('input'));
    if (loanTenureSlider) loanTenureSlider.dispatchEvent(new Event('input'));
    if (riskAppetiteSlider) riskAppetiteSlider.dispatchEvent(new Event('input')); // Re-added dispatch
    if (investmentTenureSlider) investmentTenureSlider.dispatchEvent(new Event('input'));
    if (optimizationPeriodSlider) optimizationPeriodSlider.dispatchEvent(new Event('input'));
});

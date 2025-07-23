// Define your backend API URL
const BACKEND_API_URL = 'https://smart-fund-backend-api.onrender.com/calculate-allocation';

// Get references to DOM elements
const allocationForm = document.getElementById('allocationForm');
const resultsSection = document.getElementById('resultsSection');
const chartsSection = document.getElementById('chartsSection');

const outputEMI = document.getElementById('outputEMI');
const outputInvestment = document.getElementById('outputInvestment');
const outputTotalInterest = document.getElementById('outputTotalInterest');
const outputInvestmentFV = document.getElementById('outputInvestmentFV');
const outputNetWealthContainer = document.getElementById('outputNetWealthContainer');
const outputNetWealth = document.getElementById('outputNetWealth');
const outputMinTimeContainer = document.getElementById('outputMinTimeContainer');
const outputMinTime = document.getElementById('outputMinTime');
const outputGuidance = document.getElementById('outputGuidance');

// Chart instances (to destroy and re-create)
let budgetPieChartInstance;
let interestVsGainBarChartInstance;
let growthVsBalanceLineChartInstance;

allocationForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Collect user inputs
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
    const loanInterestRate = parseFloat(document.getElementById('loanInterestRate').value);
    const loanTenure = parseFloat(document.getElementById('loanTenure').value);
    const investmentTenure = parseFloat(document.getElementById('investmentTenure').value);
    const riskAppetite = document.getElementById('riskAppetite').value;
    const allocationGoal = document.querySelector('input[name="allocationGoal"]:checked').value;

    // Basic client-side validation
    if (isNaN(loanAmount) || loanAmount <= 0 ||
        isNaN(monthlyBudget) || monthlyBudget <= 0 ||
        isNaN(loanInterestRate) || loanInterestRate <= 0 ||
        isNaN(loanTenure) || loanTenure <= 0 ||
        isNaN(investmentTenure) || investmentTenure <= 0) {
        // Using a custom modal/message box instead of alert()
        displayMessage('Please enter valid positive numbers for all financial inputs.', 'error');
        return;
    }

    // Prepare data for API request
    const requestData = {
        loan_amount: loanAmount,
        monthly_budget: monthlyBudget,
        loan_interest_rate: loanInterestRate,
        loan_tenure_years: loanTenure,
        investment_tenure_years: investmentTenure,
        risk_appetite: riskAppetite,
        allocation_goal: allocationGoal
    };

    try {
        // Show a loading indicator
        outputGuidance.textContent = 'Calculating...';
        outputGuidance.className = 'mt-4 p-3 rounded-md font-medium text-center bg-blue-100 text-blue-800';
        resultsSection.classList.remove('hidden'); // Show results section while loading

        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("API Response:", result); // For debugging

        // Update results display
        outputEMI.textContent = `₹${result.monthly_emi.toFixed(2)}`;
        outputInvestment.textContent = `₹${result.monthly_investment.toFixed(2)}`;
        outputTotalInterest.textContent = `₹${result.total_loan_interest_payable.toFixed(2)}`;
        outputInvestmentFV.textContent = `₹${result.estimated_investment_future_value.toFixed(2)}`;

        // Handle goal-specific outputs
        outputNetWealthContainer.classList.add('hidden');
        outputMinTimeContainer.classList.add('hidden');

        if (allocationGoal === 'maximizeGrowth' && result.net_wealth_at_end !== null) {
            outputNetWealthContainer.classList.remove('hidden');
            outputNetWealth.textContent = `₹${result.net_wealth_at_end.toFixed(2)}`;
        } else if (allocationGoal === 'minimumTime' && result.minimum_time_to_net_zero !== null) {
            outputMinTimeContainer.classList.remove('hidden');
            outputMinTime.textContent = `${result.minimum_time_to_net_zero} Years`;
        }

        // Update guidance message
        displayMessage(result.guidance_message, result.status);

        resultsSection.classList.remove('hidden');
        chartsSection.classList.remove('hidden');

        // Render charts
        renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate);

    } catch (error) {
        console.error('Error fetching data:', error);
        displayMessage(`Error: ${error.message}. Please try again or check your inputs.`, 'error');
        resultsSection.classList.remove('hidden');
        chartsSection.classList.add('hidden'); // Hide charts on error
    }
});

// Function to display messages (replaces alert())
function displayMessage(message, type) {
    outputGuidance.textContent = message;
    let className = 'mt-4 p-3 rounded-md font-medium text-center ';
    if (type === 'success') {
        className += 'bg-green-100 text-green-800';
    } else if (type === 'warning') {
        className += 'bg-yellow-100 text-yellow-800';
    } else if (type === 'error') {
        className += 'bg-red-100 text-red-800';
    } else {
        className += 'bg-blue-100 text-blue-800'; // Default for 'calculating' or general info
    }
    outputGuidance.className = className;
}


// Function to render all charts
function renderCharts(result, monthlyBudget, loanAmount, loanTenure, loanInterestRate) {
    // Destroy previous chart instances to prevent duplicates
    if (budgetPieChartInstance) budgetPieChartInstance.destroy();
    if (interestVsGainBarChartInstance) interestVsGainBarChartInstance.destroy();
    if (growthVsBalanceLineChartInstance) growthVsBalanceLineChartInstance.destroy();

    // --- 1. Monthly Budget Pie Chart ---
    const budgetPieCtx = document.getElementById('budgetPieChart').getContext('2d');
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
                'rgba(255, 99, 132, 0.8)', // Red for EMI
                'rgba(54, 162, 235, 0.8)', // Blue for Investment
                'rgba(75, 192, 192, 0.8)'  // Green for Remaining
            ],
            hoverOffset: 4
        }]
    };
    budgetPieChartInstance = new Chart(budgetPieCtx, {
        type: 'pie',
        data: pieData,
        options: {
            responsive: true,
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

    // --- 2. Interest vs. Gain Bar Chart ---
    const barCtx = document.getElementById('interestVsGainBarChart').getContext('2d');
    const barData = {
        labels: ['Total Loan Interest', 'Estimated Investment Gain'],
        datasets: [{
            label: 'Amount (₹)',
            data: [result.total_loan_interest_payable, result.estimated_investment_future_value],
            backgroundColor: [
                'rgba(255, 159, 64, 0.8)', // Orange for Interest
                'rgba(153, 102, 255, 0.8)' // Purple for Gain
            ],
            borderColor: [
                'rgba(255, 159, 64, 1)',
                'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
        }]
    };
    interestVsGainBarChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: barData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Hide legend if only one dataset
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

    // --- 3. Investment Growth vs. Loan Balance Line Chart ---
    const lineCtx = document.getElementById('growthVsBalanceLineChart').getContext('2d');

    // --- IMPORTANT: This part assumes backend provides annual schedules.
    // If your backend doesn't, you'd need to generate approximate data here
    // or modify the backend to return these arrays.
    // For this example, I'll generate a simplified approximate schedule for demonstration.
    const years = Array.from({ length: loanTenure + 1 }, (_, i) => i);
    const loanBalanceData = [loanAmount]; // Starting balance
    const investmentGrowthData = [0]; // Starting investment value

    let currentLoanBalance = loanAmount;
    let currentInvestmentValue = 0;
    const monthlyLoanRate = (loanInterestRate / 100) / 12;
    const monthlyInvestmentRate = getInvestmentRate(result.risk_appetite) / 12; // Re-use risk appetite rate
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
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.1,
                fill: false
            },
            {
                label: 'Investment Value',
                data: investmentGrowthData,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                tension: 0.1,
                fill: false
            }
        ]
    };
    growthVsBalanceLineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: lineData,
        options: {
            responsive: true,
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

// Helper function to get the expected annual return based on risk appetite
// (This should ideally align with what your backend uses)
function getInvestmentRate(riskAppetite) {
    switch (riskAppetite) {
        case 'Low': return 0.06; // 6%
        case 'Moderate': return 0.10; // 10%
        case 'High': return 0.14; // 14%
        default: return 0.08; // Default to a moderate rate
    }
}

// Initial state: hide results and charts
resultsSection.classList.add('hidden');
chartsSection.classList.add('hidden');


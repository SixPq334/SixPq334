const API_BASE = "https://api.coingecko.com/api/v3";

const cryptos = ['bitcoin', 'ethereum', 'litecoin', 'solana', 'dogecoin'];

function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(value);
}

async function fetchCryptoPrices() {
    try {
        const response = await fetch(`${API_BASE}/simple/price?ids=${cryptos.join(',')}&vs_currencies=usd`);
        const data = await response.json();
        const container = document.getElementById('crypto-container');
        container.innerHTML = Object.keys(data)
            .map(key => {
                const usdPrice = data[key].usd;
                return `
                    <div class="col-12 col-md-6 col-lg-3">
                        <div class="chart-card">
                            <h3 class="text-light">${key.toUpperCase()}</h3>
                            <p>${formatCurrency(usdPrice, 'USD')}</p>
                        </div>
                    </div>
                `;
            })
            .join('');
        renderHistoricalCharts();
        populateCryptoSelector();
    } catch (error) {
        console.error("Błąd podczas pobierania cen kryptowalut:", error);
    }
}

async function fetchHistoricalData(cryptoId, days = 30) {
    try {
        const response = await fetch(`${API_BASE}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`);
        if (!response.ok) throw new Error(`Błąd API dla ${cryptoId}`);
        const data = await response.json();
        if (!data.prices || data.prices.length === 0) {
            throw new Error(`Brak danych historycznych dla ${cryptoId}`);
        }
        return data.prices.map(price => ({
            time: new Date(price[0]).toLocaleDateString(),
            value: price[1]
        }));
    } catch (error) {
        console.error(`Błąd pobierania danych historycznych dla ${cryptoId}:`, error);
        return [];
    }
}

function renderHistoricalCharts() {
    const chartsContainer = document.getElementById('charts-container');
    chartsContainer.innerHTML = '';
    cryptos.forEach(crypto => {
        const canvasId = `chart-${crypto}`;
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="chart-card">
                <h3 class="text-light">${crypto.toUpperCase()}</h3>
                <canvas id="${canvasId}"></canvas>
            </div>
        `;
        chartsContainer.appendChild(card);
        renderChart(crypto, canvasId);
    });
}

async function renderChart(cryptoId, canvasId) {
    const data = await fetchHistoricalData(cryptoId, 7);
    if (data.length < 2) {
        document.getElementById(canvasId).parentElement.innerHTML += `
            <p class="text-light">Brak danych historycznych do wyświetlenia wykresu dla ${cryptoId.toUpperCase()}.</p>
        `;
        return;
    }

    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.time),
            datasets: [{
                label: `Cena ${cryptoId.toUpperCase()}`,
                data: data.map(item => item.value),
                borderColor: '#FF6600',
                backgroundColor: 'rgba(255, 102, 0, 0.2)',
                fill: true
            }]
        }
    });
}

async function analyzeMarket() {
    const cryptoId = document.getElementById('crypto-select').value;
    if (!cryptoId) {
        alert("Proszę wybrać kryptowalutę.");
        return;
    }

    try {
        const data = await fetchHistoricalData(cryptoId, 7);
        if (data.length < 2) {
            document.getElementById('analyzer-result').innerHTML = '<p class="text-light">Brak wystarczających danych do analizy.</p>';
            return;
        }

        const lastPrice = data[data.length - 1].value;
        const firstPrice = data[0].value;
        const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

        let recommendation = '';
        if (priceChange > 5) {
            recommendation = `Cena wzrosła o ${priceChange.toFixed(2)}%. Może warto sprzedać, zanim cena spadnie.`;
        } else if (priceChange < -5) {
            recommendation = `Cena spadła o ${Math.abs(priceChange).toFixed(2)}%. Może warto kupić, zanim cena wzrośnie.`;
        } else {
            recommendation = `Cena zmieniła się minimalnie o ${priceChange.toFixed(2)}%. Zastanów się przed podjęciem decyzji.`;
        }

        document.getElementById('analyzer-result').innerHTML = `
            <p class="text-light">Rekomendacja dla ${cryptoId.toUpperCase()}:</p>
            <p class="text-light">Aktualna cena: ${formatCurrency(lastPrice, 'USD')}</p>
            <p class="text-light">Zmiana w ciągu ostatnich 7 dni: ${priceChange.toFixed(2)}%</p>
            <p class="text-light">${recommendation}</p>
        `;
    } catch (error) {
        console.error("Błąd podczas analizy rynku:", error);
        document.getElementById('analyzer-result').innerHTML = '<p class="text-light">Błąd podczas analizy rynku.</p>';
    }
}

function populateCryptoSelector() {
    const selector = document.getElementById('crypto-select');
    cryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto;
        option.textContent = crypto.charAt(0).toUpperCase() + crypto.slice(1);
        selector.appendChild(option);
    });
}

(async function init() {
    await fetchCryptoPrices();
})();

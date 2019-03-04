var
  progressInterval = null,
  updateChartInterval = null,
  chart = null,
  searchResult = null;

document.querySelectorAll('nav li').forEach((element) => {
  element.addEventListener('click', () => {
    $('nav li').removeClass('active');
    $(event.target).addClass('active');
    $('main > section').addClass('d-none');
    $($(event.target).attr('data-section')).removeClass('d-none');
    if ($(event.target).attr('data-section') != '#home') {
      $('header').addClass('shrink');
    } else {
      $('header').removeClass('shrink');
    }
    if ($(event.target).attr('data-section') == '#liveReports') {
      getComparisonRenderChart();
    } else {
      window.clearInterval(updateChartInterval);
    }
  })
});

if ((localStorage.getItem('coinList') == null) ||
  (localStorage.getItem('coinList') == '[]')) {
  getCoins().done(() => {
    printCoinList();
    refreshCardToggle();
  });
} else {
  printCoinList();
  refreshCardToggle();
}

function toggleDataSeries(e) {
  if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
    e.dataSeries.visible = false;
  } else {
    e.dataSeries.visible = true;
  }
  chart.render();
}

function getComparisonRenderChart() {
  let selectedCoins;
  if ((localStorage.getItem('compare') != null) &&
    (localStorage.getItem('compare') != '[]')) {
    selectedCoins = JSON.parse(localStorage.getItem('compare')).join(',');
    $.getJSON(
      'https://min-api.cryptocompare.com/data/pricemulti?fsyms=' +
      selectedCoins +
      '&tsyms=USD', (data) => {
        console.log('AJAX success');
        chart = new CanvasJS.Chart("chartContainer", {
          animationEnabled: true,
          title: {
            text: "Cryptocurrency USD Value Live Comparison"
          },
          axisX: {
            valueFormatString: "hh:mm:ss",
            intervalType: "second"
          },
          axisY: {
            title: "Coin Value"
          },
          legend: {
            cursor: "pointer",
            fontSize: 16,
            itemclick: toggleDataSeries
          },
          toolTip: {
            enabled: false,
            animationEnabled: false,
            shared: true
          },
          data: []
        });
        //chart.options.data = [];
        for (let prop in data) {
          chart.options.data.push({
            name: prop,
            type: "spline",
            yValueFormatString: "#0.##$",
            showInLegend: true,
            dataPoints: [{
              x: new Date(),
              y: data[prop].USD
            }]
          });
        }
        chart.render();
        updateChart();
      }
    );
  } else {
    document.getElementById('chartContainer').innerHTML =
      `Hey buddy! Please select coins to compare in the 'Home' Section :-)`
  }
}

function updateChart() {
  updateChartInterval = window.setInterval(() => {
    let selectedCoins = JSON.parse(localStorage.getItem('compare')).join(',');
    $.getJSON(
      'https://min-api.cryptocompare.com/data/pricemulti?fsyms=' +
      selectedCoins +
      '&tsyms=USD', (data) => {
        console.log('AJAX success');
        //{"ETH":{"USD":201.68},"BTC":{"USD":6465.49}}
        let values = [];
        for (let prop in data) {
          values.push(data[prop].USD);
        }
        chart.options.data.forEach((coin, index) => {
          coin.dataPoints.push({
            x: new Date(),
            y: values[index]
          });
        });
        chart.render();
      }
    );
  }, 2000);
}

function getCoins() {
  return $.getJSON('https://api.coingecko.com/api/v3/coins/list', (data) => {
    console.log('AJAX success');
    let coinList = [];
    for (let i = 0; i < 200; i++) {
      coinList.push(data[i]);
    }
    localStorage.setItem('coinList', JSON.stringify(coinList));
  }).promise();
}

function getMoreInfo(currency) {
  return ($.getJSON('https://api.coingecko.com/api/v3/coins/' + currency, (data) => {
    console.log('AJAX success');
    let myData = {
      name: data.name,
      image: data.image.large,
      usd: data.market_data.current_price.usd,
      eur: data.market_data.current_price.eur,
      ils: data.market_data.current_price.ils,
      date: new Date()
    }
    localStorage.setItem('info_' + currency, JSON.stringify(myData));
  }));
}

function showMoreInfo(currencyId) {
  if ( // check if 2 minutes have passed
    (!localStorage.getItem('info_' + currencyId)) ||
    new Date(JSON.parse(localStorage.getItem('info_' + currencyId)).date).getTime() + 120000 <= new Date().getTime()
  ) {
    getMoreInfo(currencyId).done(() => {
      createMoreInfoModal(currencyId);
    });
  } else {
    createMoreInfoModal(currencyId);
  }
}

function search() {
  let
    searchResult = null,
    searchTerm = document.getElementById('searchTerm').value.toUpperCase();
  try {
    searchResult = document.querySelector(
      '#home > .card[data-coin="' +
      searchTerm +
      '"]'
    );
  } finally {
    let style = document.getElementsByTagName('style')[0];
    if (searchResult) {
      style.innerHTML =
        `#home > .card:not([data-coin="${searchTerm}"]) {
        display: none;
      }`
    } else {
      style.innerHTML = '';
    }
    return false;
  }
}

function resetSearch() {
  searchTerm = document.getElementById('searchTerm').value = '';
  document.getElementsByTagName('style')[0].innerHTML = '';
}

function createMoreInfoModal(currencyId) {
  let localStorageObj = JSON.parse(localStorage.getItem('info_' + currencyId));
  document.getElementById('moreInfoModalLabel').innerText = localStorageObj.name;
  document.querySelector('#moreInfoModal .media img').src = localStorageObj.image;
  document.querySelector('#moreInfoModal .media-body').innerHTML =
    `<div><strong>USD:&nbsp;</strong>&dollar;&nbsp;${Math.floor(100 * localStorageObj.usd) / 100}</div>
    <div><strong>EUR:&nbsp;</strong>&euro;&nbsp;${Math.floor(100 * localStorageObj.eur) / 100}</div>
    <div><strong>ILS:&nbsp;</strong>&#8362;&nbsp;${Math.floor(100 * localStorageObj.ils) / 100}</div>`;
  $('#moreInfoModal').modal('show');
}

function printCoinList() {
  let cards = document.getElementById('home');
  let style = document.getElementsByTagName('style')[0];
  style.innerHTML =
  `#home * {
    display: none;
  }`
  cards.innerHTML =
    `<form onsubmit="return search()" class="form-inline">
      <input type="text"
        required
        id="searchTerm"
        class="form-control mb-2 mr-sm-2"
        placeholder="Symbol (e.g. BTC)">
      <button type="submit" class="btn btn-primary mb-2">
        Search
      </button>&nbsp;
      <button type="button" onclick="resetSearch()" class="btn btn-secondary mb-2">
        Reset
      </button>
    </form>`;
  JSON.parse(localStorage.getItem('coinList')).forEach(
    (coinListObj) => {
      cards.innerHTML +=
        `<div class="card m-1" data-coin="${coinListObj.symbol.toUpperCase()}">
          <h5 class="card-header">${coinListObj.name}</h5>
          <div class="card-body">
            <div class="mb-1">Compare</div>
            <label class="switch align-middle">
              <input type="checkbox" onchange="updateCompare('${coinListObj.symbol.toUpperCase()}')">
              <span class="slider round"></span>
            </label>
            <div>
              <button class="btn btn-primary" onclick="showMoreInfo('${coinListObj.id}')">More Info</button>
            </div>
          </div>
        </div>`;
    }
  );
  style.innerHTML = '';
}

function refreshCardToggle() {
  if (
    localStorage.getItem('compare') != null &&
    localStorage.getItem('compare') != '[]'
  ) {
    let localStorageObj = JSON.parse(localStorage.getItem('compare'));
    localStorageObj.forEach((coinSymbol) => {
      document.querySelector('#home > .card[data-coin="' + coinSymbol + '"] input').checked = true;
    });
  }
}

function updateCompare(currency) {
  let
    localStorageObj = JSON.parse(localStorage.getItem('compare')) || [],
    index = localStorageObj.indexOf(currency.toUpperCase());

  if (event.target.checked) {
    if (localStorageObj.length > 4) {
      event.target.checked = false;
      /*let buttons = '';
      localStorageObj.forEach((coin) => {
        buttons += `<button onclick= type="button" class="btn btn-danger">${coin}</button>`;
      });
      document.querySelector(
        '#tooManyCoinsModal [aria-label="Coins to exclude"]'
        ).innerHTML = buttons;*/
      $('#tooManyCoinsModal').modal('show');
    } else if (index == -1) {
      localStorageObj.push(currency);
    }
  } else if (index != -1) {
    localStorageObj.splice(index, 1);
  }
  window.localStorage.setItem('compare', JSON.stringify(localStorageObj));
}

function startLoadingProgress() {
  progressInterval = window.setInterval(() => {
    setProgress(parseInt(
      document.querySelector('#loadingModal .progress-bar')
      .getAttribute('aria-valuenow')) + 10);
  }, 10);
}

function setProgress(percent) {
  let progressbar =
    document.querySelector('#loadingModal .progress-bar');
  progressbar.style.width = percent + '%';
  progressbar.setAttribute('aria-valuenow', percent);
}
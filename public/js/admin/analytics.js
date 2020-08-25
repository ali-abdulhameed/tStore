

      var params = {
  hAxis: {
    titleTextStyle: {color: '#607d8b'},
    gridlines: { count:0},
    textStyle: { color: '#b0bec5', fontName: 'Roboto', fontSize: '12', bold: true}
  },
  vAxis: {
    minValue: 0,
    gridlines: {color:'#37474f', count:4},
    baselineColor: 'transparent'
  },
  legend: {position: 'top', alignment: 'center', textStyle: {color:'#607d8b', fontName: 'Roboto', fontSize: '12'} },
  colors: ["#3f51b5","#2196f3","#03a9f4","#00bcd4","#009688","#4caf50","#8bc34a","#cddc39"],
  areaOpacity: 0.24,
  lineWidth: 1,
  backgroundColor: 'transparent',
  chartArea: {
    backgroundColor: "transparent",
    width: '100%',
    height: '80%'
  },
      height:400, // example height, to make the demo charts equal size
      width:600,
      pieSliceBorderColor: '#263238',
      pieSliceTextStyle:  {color:'#607d8b' },
      pieHole: 0.9,
      bar: {groupWidth: "40" },
      colorAxis: {colors: ["#3f51b5","#2196f3","#03a9f4","#00bcd4"] },
      backgroundColor: 'transparent',
      datalessRegionColor: '#37474f',
      displayMode: 'regions'
    }




    google.charts.load('current', {'packages':['geochart', 'corechart', 'bar']});

    google.charts.setOnLoadCallback(piChart);
    google.charts.setOnLoadCallback(columnChart);
    google.charts.setOnLoadCallback(drawRegionsMap);
    google.charts.setOnLoadCallback(lineChart);




      function piChart() {

        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Topping');
        data.addColumn('number', 'Slices');
        data.addRows([
          ['Mushrooms', 1],
          ['Onions', 1],
          ['Olives', 2],
          ['Zucchini', 2],
          ['Pepperoni', 1]
        ]);

        var options = {title:'How Much Pizza Sarah Ate Last Night',
                       ...params};

        // Instantiate and draw the chart for Sarah's pizza.
        var chart = new google.visualization.PieChart(document.getElementById('pi-chart'));
        chart.draw(data, options);
      }



            function columnChart() {
              var data = google.visualization.arrayToDataTable([
                ['Month', 'Orders', 'Products', 'Users'],
                ['2014', 1000, 400, 200],
                ['2015', 1170, 460, 250],
                ['2016', 660, 1120, 300],
                ['2017', 1030, 540, 350]
              ]);

              var options = {
                chart: {
                  title: 'Store Performance',
                  subtitle: 'Sales, Expenses, and Profit: 2014-2017',
                },
                ...params
              }

              var chart = new google.charts.Bar(document.getElementById('column-chart'));

              chart.draw(data, google.charts.Bar.convertOptions(options));
            }






            function drawRegionsMap() {
      var data = google.visualization.arrayToDataTable([
        ['Country', 'Popularity'],
        ['Minnesota', 200],
        ['United States', 300],
        ['Brazil', 400],
        ['Canada', 500],
        ['France', 600],
        ['RU', 700]
      ]);

         var options = {
    region: 'US',
    resolution: 'provinces',
    ...params
    }

      var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));

      chart.draw(data, options);
    }


    function lineChart() {
          var data = google.visualization.arrayToDataTable([
            ['Age', 'Weight'],
            [ 8,      12],
            [ 4,      5.5],
            [ 11,     14],
            [ 4,      5],
            [ 3,      3.5],
            [ 6.5,    7]
          ]);

          var options = {
            title: 'Age vs. Weight comparison',
            ...params
          }

        options.hAxis.baseline = 'transparent'
        options.hAxis.gridlines = 'transparent'
        options.width = 500
        options.height = 300
          var chart = new google.visualization.ScatterChart(document.getElementById('line-chart'));

          chart.draw(data, options);
        }

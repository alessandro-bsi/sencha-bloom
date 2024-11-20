import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
const GraphComponent = ({ providers, suppliers, manufacturers, distributors, retailers }) => {
    ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

    // Prepare your data for the chart
    let data = [0, 0, 0, 0, 0];

    [providers, suppliers, manufacturers, distributors, retailers].forEach((actors, index) => {
       if(Array.isArray(actors)) {
           data[index] = actors.length;
       } else if(actors instanceof Map) {
           let actor = Array.from(actors, ([idx, actors]) => (actors));
           data[index] = actor.length;
       }
    });

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Operations Chain node',
            },
        },
    };

    const chartData = {
        labels: ['Providers', 'Suppliers', 'Manufacturers', 'Distributors', 'Retailers'],
        datasets: [
            {
                label: 'Number of Nodes',
                data: data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'  // New color added
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'  // Corresponding border color for the new color
                ],
                borderWidth: 1,
            },
        ],
    };

    return <Bar options={options} data={chartData} />;
};

export default GraphComponent;

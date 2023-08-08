import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { EventContext } from '../context/EventContext';
import { QueryContext } from '../context/QueryContext';
import EventChart from '../charts/EventChart';
import { Button } from '@material-ui/core';
// import GrafanaEventChart from '../charts/GrafanaEventChart';
import { get } from 'http';

interface EventContainerProps {
  sizing: string;
  colourGenerator: Function;
}

interface Params {
  service: string;
}
interface MetricObject {
  [key: string]: {
    value: string[],
    time: string[]
  }
}

interface EventDataObject {
  [key: string]: MetricObject
}

const EventContainer: React.FC<EventContainerProps> = React.memo(props => {
  const { eventData } = useContext(EventContext);
  const { selectedMetrics } = useContext(QueryContext);
  const { service } = useParams<keyof Params>() as Params;
  const { sizing, colourGenerator } = props;
  // eventChartsArr contains all charts of all metrics
  const [eventChartsArr, setEventChartsArr] = useState<JSX.Element[]>([]);
  const [currIndex, setCurrIndex] = useState(0);
  const [currChunk, setCurrChunk] = useState<JSX.Element[]>([]);
  const chunkSize = 7;

  // nextChunk and prevChunk handle button clicks to show a limited number of graphs per page to prevent crashing
  function nextChunk() {
    const nextChunk = eventChartsArr.slice(currIndex, currIndex + chunkSize);
    setCurrChunk(nextChunk);
    setCurrIndex(currIndex + chunkSize);
  }
  function prevChunk() {
    const prevChunk = eventChartsArr.slice(currIndex - 2 * chunkSize, currIndex - chunkSize);
    setCurrChunk(prevChunk);
    setCurrIndex(currIndex - chunkSize);
  }

  /*
  Chronos11 -- Unfortunately, eventData is not in a good place for UI/UX purposes. These charts are being rendered 1:1 with the list of metrics (over 500).
  These metrics are scraped and generated by Prometheus, and should be sent to a Grafana instance to be displayed with
  a Grafana dashboard, but we didn't realize this was happening until we were too close to launch to fix it.
  It would be wonderful if a future iteration could manipulate the prometheus configuration in the kubernetes example to send its data
  to an instance of Grafana, and integrate Grafana's dashboard into Chronos to visualize the data.
  */

  const filterSelectedEventMetricsandData = (eventDataObj: EventDataObject): EventDataObject => {
    const filteredEventData = {};
    // there's only one element in the selected metrics array for now...
    // selectedMetrics is... [{Event: ['metric', 'names', 'as', 'strings']}]
    // use this array of selected metrics to filter the eventData down to only the metrics we want to see
    const selectedArr = selectedMetrics[0].Event;
    console.log('selectedArr IS: ', selectedArr)
    // only one service... 'Event'
    for (const service in eventDataObj) {
      filteredEventData[service] = {};
      // define the object of all the metrics
      const serviceMetricsObject = eventDataObj[service];
      console.log('serviceMetricsObject IS: ', serviceMetricsObject)
      // iterate through all the metrics
      for (const metricName in serviceMetricsObject) {
        // if the metric name matches a string in the selectedArr, we add it to our filtered object
        if (selectedArr.includes(metricName)) {
          filteredEventData[service][metricName] = serviceMetricsObject[metricName];
        }
      };
    };
    console.log('filteredEventData IS: ', filteredEventData)
    return filteredEventData;
  };

  // helper function for geting only the names of the metrics
  const getIndex = (str: string, substr: string, ind: number): number => {
    let Len = str.length,
      i = -1;
    while (ind-- && i++ < Len) {
      i = str.indexOf(substr, i);
      if (i < 0) break;
    }
    return i;
  }

  // iterate over the filtered event data to build an array of charts, then set the event charts array state
  const generateEventCharts = (filteredEventDataObj: EventDataObject): void => {
    const chartsArray: JSX.Element[] = [];
    const grafanaChartsArray: JSX.Element[] = [];
    let parsedName: string = '';
    const keymaker = () => {
      return Math.floor(Math.random() * 1000);
    };
    for (const service in filteredEventDataObj) {
      const metricObject = filteredEventDataObj[service];
      for (const metricName in metricObject) {
        console.log('metricName IS: ', metricName)
        // parsedName = metricName.slice(getIndex(metricName, '/', 2) + 1, metricName.length);
        const chartData = metricObject[metricName];
        console.log('chartData IS: ', chartData)
        // plotting using plotly
        chartsArray.push(
          <EventChart
            key={'E' + keymaker()}
            metricName={metricName}
            chartData={chartData}
            sizing={sizing}
            colourGenerator={colourGenerator}
          />
        );
        // plotting using grafana
        // grafanaChartsArray.push(
        //   <GrafanaEventChart parsedName={parsedName} />);
      }
    }
    setEventChartsArr(chartsArray);
    setCurrChunk(chartsArray.slice(currIndex, currIndex + chunkSize));
    setCurrIndex(currIndex + chunkSize);
  };

  // invoke the filter and generate functions to render charts
  useEffect(() => {
    const filteredEventData = filterSelectedEventMetricsandData(eventData);
    generateEventCharts(filteredEventData);
  }, [eventData, service]);

  return (
    <div>
      {service.includes('kafkametrics') || service.includes('kubernetesmetrics') ? currChunk : []}
      {eventChartsArr.length > chunkSize && (
        <>
          <Button id="prevCharts" onClick={prevChunk} variant="contained" color="primary" disabled={currIndex <= chunkSize}>
            Prev
          </Button>
          <Button id="nextCharts" onClick={nextChunk} variant="contained" color="primary" disabled={currIndex >= eventChartsArr.length}>
            Next
          </Button>
        </>
      )}
    </div>
  );
});

export default EventContainer;


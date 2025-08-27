import React, { useState, useEffect } from 'react';

// Helper functions for calendar calculations
const getMonthData = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  const endDate = new Date(lastDay);
  
  // Adjust start date to beginning of week (Monday)
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday (1) to be the start, so we need to adjust
  const firstDayOfWeek = firstDay.getDay();
  const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Sunday = 6 days from Monday
  startDate.setDate(startDate.getDate() - daysFromMonday);
  
  // Adjust end date to end of week (Sunday)
  const lastDayOfWeek = lastDay.getDay();
  const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endDate.setDate(endDate.getDate() + daysToSunday);
  
  const days = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Create date string in local timezone to avoid UTC offset issues
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    days.push({
      date: new Date(currentDate),
      isCurrentMonth: currentDate.getMonth() === firstDay.getMonth(),
      dateString: dateString
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarView({ calendarData, onDateSelect, selectedDate, className = '' }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  
  // Create a lookup map for calendar data
  const dataLookup = {};
  if (calendarData && calendarData.calendar_data) {
    calendarData.calendar_data.forEach(day => {
      dataLookup[day.date] = day;
    });
  }
  
  // Get days for current month
  const days = getMonthData(currentYear, currentMonth);
  
  // Navigation handlers
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };
  
  // Handle date selection
  const handleDateClick = (day) => {
    if (day.isCurrentMonth && dataLookup[day.dateString]) {
      onDateSelect(day.dateString);
    }
  };
  
  // Check if date is selected
  const isDateSelected = (day) => {
    return selectedDate === day.dateString;
  };
  
  // Get day cell content
  const getDayContent = (day) => {
    const dayData = dataLookup[day.dateString];
    const dayNumber = day.date.getDate();
    
    if (!day.isCurrentMonth) {
      return (
        <div style={{
          color: '#ccc',
          fontSize: '14px',
          padding: '8px',
          textAlign: 'center'
        }}>
          {dayNumber}
        </div>
      );
    }
    
    if (!dayData || dayData.total_count === 0) {
      return (
        <div style={{
          color: '#666',
          fontSize: '14px',
          padding: '8px',
          textAlign: 'center'
        }}>
          {dayNumber}
        </div>
      );
    }
    
    return (
      <div style={{
        padding: '4px',
        textAlign: 'center',
        cursor: 'pointer',
        borderRadius: '4px',
        backgroundColor: isDateSelected(day) ? '#e3f2fd' : 'transparent',
        border: isDateSelected(day) ? '2px solid #2196f3' : '1px solid transparent'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px' }}>
          {dayNumber}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', flexWrap: 'wrap' }}>
          {dayData.text_count > 0 && (
            <span style={{
              fontSize: '10px',
              backgroundColor: '#2196f3',
              color: 'white',
              borderRadius: '8px',
              padding: '1px 4px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              📝{dayData.text_count}
            </span>
          )}
          {dayData.photo_count > 0 && (
            <span style={{
              fontSize: '10px',
              backgroundColor: '#4caf50',
              color: 'white',
              borderRadius: '8px',
              padding: '1px 4px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              📷{dayData.photo_count}
            </span>
          )}
          {dayData.audio_count > 0 && (
            <span style={{
              fontSize: '10px',
              backgroundColor: '#ff9800',
              color: 'white',
              borderRadius: '8px',
              padding: '1px 4px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              🎵{dayData.audio_count}
            </span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className={`calendar-view ${className}`} style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <button
          onClick={goToPreviousMonth}
          style={{
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ‹
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Today
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          style={{
            background: 'none',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ›
        </button>
      </div>
      
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        marginBottom: '10px'
      }}>
        {DAY_NAMES.map(dayName => (
          <div
            key={dayName}
            style={{
              padding: '8px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#666',
              backgroundColor: '#f8f9fa'
            }}
          >
            {dayName}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        backgroundColor: '#f0f0f0'
      }}>
        {days.map((day, index) => (
          <div
            key={index}
            onClick={() => handleDateClick(day)}
            style={{
              minHeight: '60px',
              backgroundColor: 'white',
              cursor: day.isCurrentMonth && dataLookup[day.dateString] ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              ':hover': day.isCurrentMonth && dataLookup[day.dateString] ? {
                backgroundColor: '#f5f5f5'
              } : {}
            }}
          >
            {getDayContent(day)}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Legend:</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <span>📝 Text entries</span>
          <span>📷 Photo entries</span>
          <span>🎵 Audio entries</span>
        </div>
        <div style={{ marginTop: '5px', color: '#666' }}>
          Click on days with content to filter entries
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
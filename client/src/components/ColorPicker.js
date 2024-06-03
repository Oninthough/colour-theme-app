import React from 'react';
import { useDispatch } from 'react-redux';
import { setColorTheme } from '../redux/actions';

const ColorPicker = ({ colors }) => {
    const dispatch = useDispatch();

    const handleColorChange = (color) => {
        dispatch(setColorTheme(color));
        // Assume function saveColorPreference makes an API call to backend
        saveColorPreference(color);
    };

    return (
        <div>
            {colors.map(color => (
                <button key={color} style={{ background: color }} onClick={() => handleColorChange(color)}>
                    {color}
                </button>
            ))}
        </div>
    );
};

export default ColorPicker;

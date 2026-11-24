import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const API_URL = `${API_BASE_URL}/api/reviews`;

export const getReviewsAPI = async (targetId) => {
    return await axios.get(`${API_URL}/${targetId}`);
};

export const getMyReviewsAPI = async (token) => {
    const config = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
    return await axios.get(`${API_URL}/me`, config);
};

export const addReviewAPI = async (reviewData, token) => {
    const response = await fetch(API_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: reviewData });
    const data = await response.json();
    if (!response.ok) throw { response: { data, status: response.status } };
    return { data };
};

export const updateReviewAPI = async (id, reviewData, token) => {
    const config = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
    return await axios.put(`${API_URL}/${id}`, reviewData, config);
};

export const deleteReviewAPI = async (id, token) => {
    const config = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
    return await axios.delete(`${API_URL}/${id}`, config);
};

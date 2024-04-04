import { useState } from "react"

import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

export const Inputs = () => {
    // Formik setup with initial values, validation schema, and submit function
    const formik = useFormik({
        initialValues: {
            usState: '',
            keyword: ''
        },
        validationSchema: Yup.object({
            usState: Yup.string()
                .required('Required')
                .matches(/^[a-zA-Z ]*$/, 'Invalid state name'),
            keyword: Yup.string()
                .required('Required')
        }),
        onSubmit: values => {
            console.log(values);
        },
    });

    return (
        <form onSubmit={formik.handleSubmit}>
            <div>
                <label htmlFor="usState">US State</label>
                <input
                    id="usState"
                    name="usState"
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.usState}
                />
                {formik.touched.usState && formik.errors.usState ? (
                    <div>{formik.errors.usState}</div>
                ) : null}
            </div>
            <div>
                <label htmlFor="keyword">Keyword</label>
                <input
                    id="keyword"
                    name="keyword"
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.keyword}
                />
                {formik.touched.keyword && formik.errors.keyword ? (
                    <div>{formik.errors.keyword}</div>
                ) : null}
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

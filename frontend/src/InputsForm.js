import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Define the validation schema
const InputsSchema = Yup.object({
  usState: Yup.string()
    .required('State is required')
    .matches(/^[a-zA-Z ]*$/, 'Invalid state name'),
  city: Yup.string()
    .required('City is required')
    .matches(/^[a-zA-Z ]*$/, 'Invalid city name'),
  keyword: Yup.string()
    .required('Business keyword is required'),
});

const InputsForm = ({ onSubmit }) => {
  return (
    <Formik
      initialValues={{ usState: '', city: '', keyword: '' }}
      validationSchema={InputsSchema}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(false); // Mark submission as complete
        if (onSubmit) {
          onSubmit(values); // Pass the form values to the parent component
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <div>
            <label htmlFor="keyword">Keyword</label>
            <Field name="keyword" type="text" />
            <ErrorMessage name="keyword" component="div" style={{ color: 'red' }} />
          </div>

          <div>
            <label htmlFor="usState">US State</label>
            <Field name="usState" type="text" />
            <ErrorMessage name="usState" component="div" style={{ color: 'red' }} />
          </div>

          <div>
            <label htmlFor="city">City</label>
            <Field name="city" type="text" />
            <ErrorMessage name="city" component="div" style={{ color: 'red' }} />
          </div>

          <button type="submit" disabled={isSubmitting}>
            Gather Data
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default InputsForm;

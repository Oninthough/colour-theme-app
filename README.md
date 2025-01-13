import { useEffect } from 'react';
import * as yup from 'yup';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '../../../../../../shared/components/navigation/Link';
import Icon from '../../../../../../shared/components/ui/Icon';
import Form from '../../../../../../shared/components/form/Form';
import {
  useAppDispatch,
  useAppSelector,
} from '../../../../../../shared/store/hooks';
import {
  fetchElementsDetailsAsync,
  updateElementsAsync,
} from '../../../../store/elements/actions';
import { useNavigate, useParams } from 'react-router-dom';
import { Element } from '../../../../types/Element';

const elementSchema = yup.object().shape({
  name: yup
    .string()
    .trim('Element name cannot contain leading or trailing whitespace')
    .strict(true)
    .max(50, 'Element name should not exceed 50 characters')
    .required('Element name is required'),
  enable: yup
    .boolean()
    // .oneOf([true], 'Active is required')
    // .required('Active is required.')
    .optional(),
  elementId: yup
    .number()
    // .trim('Element name cannot contain leading or trailing whitespace')
    .strict(true)
    .max(20, 'Element Id  should not exceed 50 characters')
    .required('Element Id is required'),
  description: yup
    .string()
    .trim('Description cannot contain leading or trailing whitespace')
    .strict(true)
    .max(500, 'Description should not exceed 500 characters')
    .optional(),
  resultFormatType: yup
    .string()
    // .trim('resultFormat cannot contain leading or trailing whitespace')
    // .strict(true)
    .max(10, 'resultFormat should not exceed 10 characters'),
    // .required('resultFormat is required'),
  delimiter: yup.string()
   .optional(),

  // .trim('delimiter cannot contain leading or trailing whitespace')
  // .strict(true)
  // .max(10, 'delimiter should not exceed 10 characters')
  // .required('delimiter is required'),
});

type ElementSchema = yup.InferType<typeof elementSchema>;

export default function ElementsEdit() {
  const elementsStore = useAppSelector((state) => state.elements);
  const dispatch = useAppDispatch();

  const methods = useForm<ElementSchema>({
    mode: 'onTouched',
    defaultValues: {
      name: '',
      elementId: 0,
      description: '',
      delimiter: '',
      resultFormatType: '',
      enable: false,
    },
    resolver: yupResolver(elementSchema),
    disabled: elementsStore.loading,
    values: {
      // Update Clients form
      elementId: elementsStore.details?.elementId || 0,
      name: elementsStore.details?.name || '',
      enable: elementsStore.details?.enabled || false,
      description: elementsStore.details?.description || '',
      delimiter: elementsStore.details?.delimiter?.toString() || '',
      resultFormatType: elementsStore.details?.resultFormatType || '',
    },
  });

  const navigate = useNavigate();
  const { elementId } = useParams<{ elementId: string }>();

  // useEffect(() => {
  //   if (elementId) {
  //     dispatch(fetchElementsDetailsAsync(+elementId));
  //   }
  //   
  // }, [elementId]);

  useEffect(() => {
    if (elementId) {
      console.log(' inital Id ' + elementId);
      dispatch(fetchElementsDetailsAsync(+elementId))
        .unwrap()
        .then((elementDetails) => {
          console.log(elementDetails);

          // Update serviceKeyDetails form
          methods.setValue('elementId', elementDetails.elementId!, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
          methods.setValue('name', elementDetails.name, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
          methods.setValue('description', elementDetails.description, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
          methods.setValue('delimiter', elementDetails.delimiter!, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
          methods.setValue(
            'resultFormatType',
            elementDetails.resultFormatType!,
            {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            }
          );
          methods.setValue('enable', elementDetails.enabled, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        });
    }
  }, [elementId]);

  const onSubmit: SubmitHandler<ElementSchema> = async (data) => {
    console.log(data);
    const reqData: Element = {
      elementId: data.elementId!,
      name: data.name,
      enabled: data.enable as boolean,
      description: data.description as string,
      delimiter: data.delimiter as string,
      resultFormatType: data.resultFormatType as string,
    };
    // console.log('reqData', reqData);

    try {
      await dispatch(updateElementsAsync(reqData)).unwrap();
      navigate('./serviceKeyMap');
    } catch (error) {
      // error handle
    }
  };

  return (
    // <MainContent title={'Edit Element'}>
    //   <Flexbox justifyContent="flex-start" gap={2} sx={{ px: 2, py: 1.25 }}>
    //     <IconButton
    //       size="small"
    //       sx={{ color: 'inherit' }}
    //       component={Link}
    //       to=".."
    //     >
    //       <Icon name="E1X_ico_font-37" size="XSMALL" />
    //     </IconButton>
    //   </Flexbox>
    //   <Divider sx={{ borderColor: TU_COLOR_PALETTE.neutral.grey }} />
    //   <Grid container spacing={3} sx={{ p: 3 }}>
    <Grid xs={12}>
      <FormProvider {...methods}>
        <Form onSubmit={methods.handleSubmit(onSubmit)}>
          <Form.Input<ElementSchema>
            name="name"
            id="name"
            label="Element Name"
            placeholder="Enter element name"
            required
          />
          <Form.Checkbox<ElementSchema>
            name="enable"
            id="enable"
            label="Enable"
            required
          />
          <Form.Input<ElementSchema>
            name="description"
            id="description"
            label="Description"
            placeholder="Enter description"
            multiline
            rows={3}
          />
          <Form.Input<ElementSchema>
            name="delimiter"
            id="delimiter"
            label="Delimiter"
            placeholder="Enter delimiter"
          />
          <Form.Input<ElementSchema>
            name="resultFormatType"
            id="resultFormatType"
            label="Result Format Type"
            placeholder="Enter result Format"
            // required
          />
          <Stack
            direction="row"
            justifyContent="flex-end"
            gap={2}
            sx={{ mt: 1 }}
          >
            <Button
              variant="outlined"
              color="inherit"
              // startIcon={<Icon name="E1X_ico_font-50" size="XSMALL" />}
              component={Link}
              to=".."
            >
              Cancel
            </Button>
            <Form.Button
              color="secondary"
              startIcon={<Icon name="E1X_ico_font-21" size="XSMALL" />}
              loadingPosition="start"
              // disableOnInvalid
            >
              Update
            </Form.Button>
          </Stack>
        </Form>
      </FormProvider>
    </Grid>
  );
}
update button is not working it's not hitting the api it should call this method       await dispatch(updateElementsAsync(reqData)).unwrap();

remove the validation if needed but make work 
in this page it is working fine 
// import { useEffect } from 'react';
import * as yup from 'yup';
import { SubmitHandler, useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';

import Link from '../../../../../../shared/components/navigation/Link';
import Icon from '../../../../../../shared/components/ui/Icon';
import Form from '../../../../../../shared/components/form/Form';
import {
  useAppDispatch,
  useAppSelector,
} from '../../../../../../shared/store/hooks';
// import {
//   fetchElementsDetailsAsync,
//   updateElementsAsync,
// } from '../../../../store/elements/actions';
import { useNavigate, useParams } from 'react-router-dom';
import MainContent from '../../../../components/MainContent';
// import { Element } from '../../../../types/Element';

// import ElementsList from '../../List';
import ElementsServiceKeysList from '../ElementServisKeyList';
import { ElementServiceKeyMap } from '../../../../types/ElementServiceKeyMap';
import { updateElementServiceKeyMapAsync } from '../../../../store/elementServiceKeyMap/actions';

const elementServiceKeySchema = yup.object().shape({
  serviceKeyId: yup
    .number()
    .strict(true)
    .max(20, 'ServiceKey Id  should not exceed 50 characters')
    .required('ServiceKey Id is required'),
  name: yup
    .string()
    .trim('ServiceKey name cannot contain leading or trailing whitespace')
    .strict(true)
    .max(50, 'ServiceKey name should not exceed 50 characters')
    .required('ServiceKey name is required'),
  nameOverride: yup
    .string()
    .trim(
      'ServiceKey nameOverride cannot contain leading or trailing whitespace'
    )
    .strict(true)
    .max(50, 'ServiceKey nameOverride should not exceed 50 characters')
    .required('ServiceKey nameOverride is required'),
  description: yup
    .string()
    .trim('Description cannot contain leading or trailing whitespace')
    .strict(true)
    .max(500, 'Description should not exceed 500 characters')
    .optional(),
  descriptionOverride: yup
    .string()
    .trim('descriptionOverride cannot contain leading or trailing whitespace')
    .strict(true)
    .max(500, 'descriptionOverride should not exceed 500 characters')
    .optional(),
});

type ElementServiceKeySchema = yup.InferType<typeof elementServiceKeySchema>;

export default function ElementServiceKeyEdit() {
  // const elementsStore = useAppSelector((state) => state.elements);
  const elementsServiceKeyStore = useAppSelector(
    (state) => state.elementServiceKeys
  );

  const dispatch = useAppDispatch();

  const methods = useForm<ElementServiceKeySchema>({
    mode: 'onTouched',
    defaultValues: {
      serviceKeyId: 0,
      name: '',
      nameOverride: '',
      description: '',
      descriptionOverride: '',
    },
    resolver: yupResolver(elementServiceKeySchema),
    disabled: elementsServiceKeyStore.loading,
    values: {
      // Update form
      serviceKeyId: elementsServiceKeyStore.details?.serviceKeyId || 0,
      nameOverride: elementsServiceKeyStore.details?.nameOverride || '',
      descriptionOverride:
        elementsServiceKeyStore.details?.descriptionOverride || '',
      name: elementsServiceKeyStore.details?.name || '',
      description: elementsServiceKeyStore.details?.description || '',
    },
  });

  const navigate = useNavigate();
  const { serviceKeyId } = useParams<{
    elementId: string;
    serviceKeyId: string;
  }>();

  const onSubmit: SubmitHandler<ElementServiceKeySchema> = async (data) => {
    const reqData: ElementServiceKeyMap = {
      serviceKeyId: data.serviceKeyId!,
      name: data.name,
      nameOverride: data.nameOverride as string,
      description: data.description as string,
      descriptionOverride: data.descriptionOverride as string,
    };
    // console.log('reqData', reqData);

    try {
      await dispatch(updateElementServiceKeyMapAsync(reqData)).unwrap();
      navigate('../../serviceKeyMap');
    } catch (error) {
      // error handle
    }
  };

  return (
    <MainContent title={'Edit Element-ServiceKey Mapping'}>
      {/* <Flexbox justifyContent="flex-start" gap={2} sx={{ px: 2, py: 1.25 }}>
        <IconButton
          size="small"
          sx={{ color: 'inherit' }}
          component={Link}
          to=".."
        >
          <Icon name="E1X_ico_font-37" size="XSMALL" />
        </IconButton>
      </Flexbox>
      <Divider sx={{ borderColor: TU_COLOR_PALETTE.neutral.grey }} /> */}
      <Grid container spacing={3} sx={{ p: 3 }}>
        <Grid xs={12}>
          <ElementsServiceKeysList />
        </Grid>
        {serviceKeyId && (
          <Grid xs={12} sm={8} md={6}>
            <FormProvider {...methods}>
              <Form onSubmit={methods.handleSubmit(onSubmit)}>
                <Form.Input<ElementServiceKeySchema>
                  name="name"
                  id="name"
                  label="ServiceKey Name"
                  placeholder="Enter ServiceKey name"
                  required
                />
                <Form.Input<ElementServiceKeySchema>
                  name="nameOverride"
                  id="nameOverride"
                  label="NameOverride"
                  required
                />
                <Form.Input<ElementServiceKeySchema>
                  name="description"
                  id="description"
                  label="Description"
                  placeholder="Enter description"
                  multiline
                  rows={3}
                />
                <Form.Input<ElementServiceKeySchema>
                  name="descriptionOverride"
                  id="descriptionOverride"
                  label="DescriptionOverride"
                  placeholder="Enter descriptionOverride"
                  required
                />
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  gap={2}
                  sx={{ mt: 1 }}
                >
                  <Button
                    variant="outlined"
                    color="inherit"
                    // startIcon={<Icon name="E1X_ico_font-50" size="XSMALL" />}
                    component={Link}
                    to=".."
                  >
                    Cancel
                  </Button>
                  <Form.Button
                    color="secondary"
                    startIcon={<Icon name="E1X_ico_font-21" size="XSMALL" />}
                    loadingPosition="start"
                    disableOnInvalid
                  >
                    Update
                  </Form.Button>
                </Stack>
              </Form>
            </FormProvider>
          </Grid>
        )}
      </Grid>
    </MainContent>
  );
}

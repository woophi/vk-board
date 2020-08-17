import React from 'react';
import { useFela } from 'react-fela';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatchActions, FetchingStateName } from 'core/models';
import { FormLayout, Input, withModalRootContext, Div, FormStatus, Spinner } from '@vkontakte/vkui';
import { getEditTaskValues } from 'core/selectors/board';
import Icon20ArticleOutline from '@vkontakte/icons/dist/20/article_outline';
import Icon20RecentOutline from '@vkontakte/icons/dist/20/recent_outline';
import { Button } from 'atoms/Button';
import { isThemeDrak } from 'core/selectors/common';
import { format, isBefore, addDays } from 'date-fns';
import { getEditTaskInfo } from 'core/selectors/task';

const nextDay = format(addDays(new Date(), 1), 'yyyy-MM-dd');

type Props = {
  updateModalHeight?: () => void;
  editable: boolean;
  stopEdit: () => void;
};

const EditTaskPC = React.memo<Props>(({ editable, updateModalHeight, stopEdit }) => {
  const { css } = useFela();
  const dispatch = useDispatch<AppDispatchActions>();
  const dark = useSelector(isThemeDrak);
  const formValues = useSelector(getEditTaskValues);
  const { error, hasError, updating, notSameData } = useSelector(getEditTaskInfo);
  const disabledSubmit = !formValues.name || !formValues.description || updating || !notSameData;

  const before = formValues.dueDate && isBefore(new Date(formValues.dueDate), new Date());

  React.useEffect(() => {
    if (updateModalHeight) {
      updateModalHeight();
    }
  }, [editable, hasError, updateModalHeight]);

  React.useEffect(() => {
    return () => {
      stopEdit();
    };
  }, []);

  React.useEffect(() => {
    if (before) {
      dispatch({
        type: 'EDIT_TASK',
        payload: { name: 'dueDate', value: nextDay },
      });
    }
  }, [before]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    dispatch({ type: 'EDIT_TASK', payload: { name, value } });
  };

  const submitForm = React.useCallback(() => {
    dispatch({ type: 'SET_UPDATING_DATA', payload: FetchingStateName.EditTask });
  }, [dispatch]);

  const showError = hasError && <FormStatus header={error} mode="error" />;

  if (!editable) {
    return null;
  }

  return (
    <>
      <FormLayout className={'useMonrope'}>
        {showError}
        <span className={css({ display: 'flex' })}>
          <Icon20ArticleOutline
            className={css({
              marginLeft: '22px',
              marginTop: '12px',
              color: dark ? '#5F5F5F' : '#CFCFCF',
            })}
          />
          <Input
            type="text"
            placeholder="Введите описание"
            minLength={1}
            maxLength={2048}
            className={css({
              marginLeft: '0 !important',
              width: '100%',
              '>div': {
                border: 'none !important',
                background: 'transparent !important',
              },
              '>input': {
                '::placeholder': {
                  color: dark ? '#5F5F5F' : '#CFCFCF',
                },
              },
            } as any)}
            name="description"
            onChange={onChange}
            status={formValues.description ? 'valid' : 'error'}
            disabled={updating}
            value={formValues.description}
          />
        </span>
        <span className={css({ display: 'flex' })}>
          <Icon20RecentOutline
            className={css({
              marginLeft: '22px',
              marginTop: '12px',
              color: dark ? '#5F5F5F' : '#CFCFCF',
            })}
          />
          <Input
            type="date"
            placeholder="Выберите срок"
            className={css({
              marginLeft: '0 !important',
              width: '100%',
              '>div': {
                border: 'none !important',
                background: 'transparent !important',
              },
              '>input': {
                '::placeholder': {
                  color: dark ? '#5F5F5F' : '#CFCFCF',
                },
              },
            } as any)}
            name="dueDate"
            onChange={onChange}
            disabled={updating}
            min={nextDay}
            value={formValues.dueDate ?? ''}
          />
        </span>
      </FormLayout>
      <Div className={css({ display: 'flex' })}>
        <Button
          mode="secondary"
          stretched
          size="xl"
          disabled={updating}
          onClick={stopEdit}
          className={css({ marginRight: '10px' })}
        >
          Отмена
        </Button>

        <Button
          mode="primary"
          stretched
          size="xl"
          before={updating ? <Spinner /> : null}
          disabled={disabledSubmit}
          onClick={submitForm}
        >
          Сохранить
        </Button>
      </Div>
    </>
  );
});

export const EditTask = withModalRootContext(EditTaskPC);

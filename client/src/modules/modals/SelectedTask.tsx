import React from 'react';
import { useFela } from 'react-fela';
import { useSelector, useDispatch } from 'react-redux';
import { MiniInfoCell, Text, Div, Spinner } from '@vkontakte/vkui';
import Icon20ArticleOutline from '@vkontakte/icons/dist/20/article_outline';
import Icon20RecentOutline from '@vkontakte/icons/dist/20/recent_outline';
import Icon28WriteOutline from '@vkontakte/icons/dist/28/write_outline';
import Icon28DeleteOutlineAndroid from '@vkontakte/icons/dist/28/delete_outline_android';
import Icon28Notifications from '@vkontakte/icons/dist/28/notifications';
import Icon28NotificationDisableOutline from '@vkontakte/icons/dist/28/notification_disable_outline';
import { ru } from 'date-fns/locale';
import { Button } from 'atoms/Button';
import {
  isTaskDeleteUpdating,
  getSelectedTaskInfo,
  isTaskNotifUpdating,
} from 'core/selectors/task';
import { isThemeDrak } from 'core/selectors/common';
import { format } from 'date-fns';
import { AppDispatchActions, FetchingStateName, MainView, ActiveModal } from 'core/models';
import { getNotifications } from 'core/selectors/settings';
import { vkBridge } from 'core/vk-bridge/instance';
import { push, getSearch } from 'connected-react-router';

export const SelectedTask = React.memo(() => {
  const { css } = useFela();
  const info = useSelector(getSelectedTaskInfo);
  const search = useSelector(getSearch);
  const notifyEnabled = useSelector(getNotifications);
  const [notifyRequest, setRequest] = React.useState(false);
  const [notif, setNotif] = React.useState(info.notification);
  const deletting = useSelector(isTaskDeleteUpdating);
  const notifUpdating = useSelector(isTaskNotifUpdating) || notifyRequest;
  const dark = useSelector(isThemeDrak);
  const dispatch = useDispatch<AppDispatchActions>();

  const changeNotificationsPermission = async () => {
    setRequest(true);
    try {
      if (!notifyEnabled && !notifyRequest) {
        const enabled = await vkBridge.send('VKWebAppAllowNotifications');
        dispatch({ type: 'SET_NOTIFICATIONS', payload: enabled.result });
      }
    } catch (_) {}

    setRequest(false);
  };

  const deleteTask = React.useCallback(() => {
    dispatch(push(`/${MainView.Board}/${ActiveModal.DeleteTask}${search}`) as any);
  }, [dispatch, search]);

  const editTask = React.useCallback(() => {
    dispatch(push(`/${MainView.Board}/${ActiveModal.EditTask}${search}`) as any);
  }, [dispatch, search]);

  const handleChangeNotif = () => {
    if (!notifyEnabled && !notif) {
      changeNotificationsPermission().then(() => {
        dispatch({
          type: 'SET_UPDATING_DATA',
          payload: FetchingStateName.NotificationTask,
          params: { notification: notifyEnabled },
        });
        setNotif(notifyEnabled);
      });
    } else {
      dispatch({
        type: 'SET_UPDATING_DATA',
        payload: FetchingStateName.NotificationTask,
        params: { notification: !notif },
      });
      setNotif(!notif);
    }
  };

  return (
    <>
      {info.description !== null && (
        <Div>
          <MiniInfoCell
            before={
              <Icon20ArticleOutline className={css({ color: dark ? '#AEAEAE' : '#6A6A6A' })} />
            }
            multiline
            className={css({ padding: '6px 12px 0' })}
          >
            <Text
              weight="medium"
              className={`useMonrope ${css({
                color: dark ? '#fff' : '#000',
                overflowWrap: 'anywhere',
              })}`}
            >
              {info.description}
            </Text>
          </MiniInfoCell>
        </Div>
      )}
      {!!info.dueDate && (
        <Div>
          <MiniInfoCell
            before={
              <Icon20RecentOutline className={css({ color: dark ? '#AEAEAE' : '#6A6A6A' })} />
            }
            className={css({ padding: '0 12px' })}
          >
            <Text
              weight="medium"
              className={`useMonrope ${css({ color: dark ? '#fff' : '#000' })}`}
            >
              до {format(new Date(info.dueDate), 'dd MMMM', { locale: ru })}
            </Text>
          </MiniInfoCell>
        </Div>
      )}
      <Div className={css({ padding: '12px 24px', display: 'flex' })}>
        <Button
          onClick={deleteTask}
          disabled={deletting}
          before={deletting ? <Spinner size="regular" /> : <Icon28DeleteOutlineAndroid />}
          mode="destructive"
          size="xl"
        >
          Удалить
        </Button>
        <Button
          onClick={editTask}
          mode="tertiary"
          disabled={deletting}
          className={css({ paddingRight: 0, color: dark ? '#959595' : '#AEAEAE' })}
        >
          <Icon28WriteOutline />
        </Button>
        {!!info.dueDate && (
          <Button
            onClick={handleChangeNotif}
            mode="tertiary"
            disabled={notifUpdating}
            className={css({
              paddingRight: 0,
              color: notif ? '#4bb34b' : dark ? '#959595' : '#AEAEAE',
            })}
          >
            {notif ? <Icon28Notifications /> : <Icon28NotificationDisableOutline />}
          </Button>
        )}
      </Div>
    </>
  );
});

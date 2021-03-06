import * as sentry from '@sentry/browser';
import { Severity, User } from '@sentry/types';
import { store } from 'core/store';
import { UserInfo } from '@vkontakte/vk-bridge';
import { appV, isDev } from 'core/models';

export const captureUrlEvent = (message: string, request: sentry.Request = {}) => {
  if (isDev) {
    console.error(message);
  }
  sentry.captureEvent({
    message,
    request,
    level: Severity.Error,
  });
};
export const captureException = (exception: any) => {
  if (isDev) {
    console.error(exception);
  }
  sentry.captureException(exception);
};

const beforeSend: sentry.BrowserOptions['beforeSend'] = (event) => {
  if (!event.message || event.message?.indexOf('ChunkLoadError') !== -1) {
    return null;
  }

  const state = store.getState();
  const { ui } = state;

  event.user =
    ui.fetchingDatas.user &&
    ({
      ...event.user,
      id: String((ui.fetchingDatas.user.data as UserInfo)?.id),
      username: (ui.fetchingDatas.user.data as UserInfo)?.first_name,
      fullName: (ui.fetchingDatas.user.data as UserInfo)?.last_name,
    } as User);

  event.extra = {
    ...event.extra,
    uiState: ui,
  };

  event.tags = event.tags || {};

  return event;
};

export async function initSentry() {
  return sentry.init({
    dsn: 'https://7803710a8c20402f927abd8f048eb230@sr.testfriendship.special.vk-apps.com/4',
    release: appV.toString(),
    beforeSend,
    enabled: process.env.NODE_ENV === 'production',
    environment: 'stuff-fe',
    ignoreErrors: [/Non-Error promise rejection captured with keys/i],
  });
}

import React from 'react';
import { Div, CardGrid, Card, Text, MiniInfoCell, Spinner } from '@vkontakte/vkui';
import { useFela, CssFelaStyle } from 'react-fela';
import { useSelector, useDispatch } from 'react-redux';
import { isThemeDrak } from 'core/selectors/common';
import Icon24DoneOutline from '@vkontakte/icons/dist/24/done_outline';
import { Button } from 'atoms/Button';
import { appV, AppDispatchActions, FetchingStateName, payToUserId } from 'core/models';
import { Notifications } from './Notifications';
import { isPlatformIOS } from 'core/selectors/settings';
import Icon16Lock from '@vkontakte/icons/dist/16/lock';
import { useTransition, useChain, animated } from 'react-spring';
import { hasUserPremium, isPaymentUpdating } from 'core/selectors/payment';
import Icon24LogoGoogle from '@vkontakte/icons/dist/24/logo_google';
import { getUserId } from 'core/selectors/user';

const itemsToAppear = [
  {
    id: 1,
    text: 'Синхронизация с Google Tasks',
    type: 'info',
  },
  {
    id: 2,
    text: 'Неограниченные списки',
    type: 'info',
  },
  {
    id: 3,
    text: 'Неограниченные пользователи',
    type: 'info',
  },
  {
    id: 4,
    text: 'Приоритеты задач',
    type: 'info',
  },
  {
    id: 5,
    type: 'btn',
  },
];

export const Premium = React.memo(() => {
  const dark = useSelector(isThemeDrak);
  const updating = useSelector(isPaymentUpdating);
  const hasPremium = useSelector(hasUserPremium);
  const { css } = useFela({ dark });
  const transRef = React.useRef<any>();
  const dispatch = useDispatch<AppDispatchActions>();
  const km = useSelector(getUserId) === payToUserId;

  const handleBuy = React.useCallback(() => {
    dispatch({
      type: 'SET_UPDATING_DATA',
      payload: FetchingStateName.PaymentProccess,
    });
  }, [dispatch]);

  const cellInfoCss = css(infoStyle, textStyle);
  const textCss = css(textStyle);
  const btnCss = css({
    marginTop: '31px',
  });

  const buyButton =
    isPlatformIOS() && !hasPremium ? (
      <Button mode="primary" stretched className={btnCss} disabled before={<Icon16Lock />} square>
        Недоступно на iOS
      </Button>
    ) : hasPremium ? (
      <Button mode="primary" stretched className={btnCss} before={<Icon24LogoGoogle />} square>
        <a href="/google/auth" target="_blank" className={css({ textDecoration: 'none' })}>
          Синхронизировать с Google Tasks
        </a>
      </Button>
    ) : (
      <Button
        mode="primary"
        stretched
        className={btnCss}
        square
        onClick={handleBuy}
        disabled={updating}
        before={updating ? <Spinner className={css({ color: dark ? '#222327' : '#fff' })} /> : null}
      >
        Купить 228 ₽
      </Button>
    );

  const transition = useTransition(itemsToAppear, {
    from: {
      transform: 'scale(0)',
    },
    enter: {
      transform: 'scale(1)',
    },
    ref: transRef,
    unique: true,
    trail: 4000 / itemsToAppear.length,
  });

  useChain([transRef], [0, 0.6]);

  const transitionFragments = transition((style, item) => {
    return (
      <animated.div style={style}>
        {item.type === 'info' ? (
          <MiniInfoCell
            before={<Icon24DoneOutline className={textCss} />}
            multiline
            className={cellInfoCss}
          >
            <Text weight="medium" className={`useMonrope ${textCss}`}>
              {item.text}
            </Text>
          </MiniInfoCell>
        ) : (
          buyButton
        )}
      </animated.div>
    );
  });

  return (
    <Div>
      <CardGrid
        className={css({
          padding: 0,
          marginBottom: '1rem',
        })}
      >
        <Card
          size="l"
          className={css({
            borderRadius: '21px !important',
            backgroundColor: dark ? 'rgba(95, 95, 95, 0.03)' : 'rgba(66, 164, 255, 0.03)',
            padding: '24px 23px',
            width: 'calc(100% - 36px) !important',
          })}
        >
          <div
            style={{
              minHeight: 50,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Text
              weight="semibold"
              className={`useMonrope ${css({
                fontSize: '18px',
                lineHeight: '24px',
              })}`}
            >
              {hasPremium ? 'Вы уже купили ' : 'Купите '}
              <span className={css({ color: '#42A4FF' })}>премиум</span>
            </Text>
            {transitionFragments}
            {km && (
              <Button
                mode="primary"
                stretched
                className={btnCss}
                before={<Icon24LogoGoogle />}
                square
              >
                <a href="/google/auth" target="_blank" className={css({ textDecoration: 'none' })}>
                  Синхронизировать с Google Tasks
                </a>
              </Button>
            )}
          </div>
        </Card>
      </CardGrid>
      <Notifications />
      <Text
        weight="medium"
        className={`useMonrope ${css(textStyle, {
          fontSize: '12px',
          lineHeight: '16px',
          color: dark ? '#5F5F5F' : '#CFCFCF',
          marginTop: '25px',
          textAlign: 'center',
        })}`}
      >
        Версия {appV}, avocado
      </Text>
    </Div>
  );
});

const infoStyle: CssFelaStyle<{}, {}> = () => ({
  padding: '0',
  marginTop: '20px',
});
const textStyle: CssFelaStyle<{}, { dark: boolean }> = ({ dark }) => ({
  color: dark ? '#FFF !important' : '#000 !important',
});

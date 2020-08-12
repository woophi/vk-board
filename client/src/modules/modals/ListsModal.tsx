import React from 'react';
import { useFela } from 'react-fela';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatchActions } from 'core/models';
import { ModalPage, ModalPageHeader, List, Separator } from '@vkontakte/vkui';
import { CellButton } from 'atoms/CellButton';
import { NewList } from './NewList';
import Icon16InfoOutline from '@vkontakte/icons/dist/16/info_outline';
import { getBoardLists } from 'core/selectors/board';

export const ListsModal = React.memo<{ id: string }>(({ id }) => {
  const { css } = useFela();
  const listItems = useSelector(getBoardLists);
  const dispatch = useDispatch<AppDispatchActions>();

  const closeModal = React.useCallback(() => {
    dispatch({ type: 'SET_MODAL', payload: null });
  }, [dispatch]);

  const selectList = React.useCallback(
    (id: number) => {
      dispatch({ type: 'SELECT_BOARD_LIST', payload: id });
    },
    [dispatch]
  );

  const handleClickList = (id: number) => {
    selectList(id);
    closeModal();
  };

  return (
    <ModalPage id={id} onClose={closeModal} header={<ModalPageHeader />}>
      <List>
        <NewList />
        {listItems.map((i) => (
          <CellButton key={i.id} onClick={() => handleClickList(i.id)}>
            {i.name}
          </CellButton>
        ))}
      </List>
      <Separator wide />
      <List>
        <CellButton before={<Icon16InfoOutline />}>Информация</CellButton>
      </List>
      <div className={css({ height: '10px' })} />
    </ModalPage>
  );
});

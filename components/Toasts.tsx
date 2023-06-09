import styled from "@emotion/styled";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef } from "react";
import { Box, ToastId, useToast } from "@chakra-ui/react";
import { RemoteParticipant, SpaceEvent } from "@mux/spaces-web";

import { useSpace } from "hooks/useSpace";

import {
  broadcastingToastConfig,
  participantEventToastConfig,
  sharingScreenToastConfig,
  ToastIds,
  viewingSharedScreenToastConfig,
} from "shared/toastConfigs";

const ToastBox = styled(Box)`
  color: #666666;
  background: #fceaf0;
  border: 1px solid #df2868;
  border-radius: 3px;
  font-size: 14px;
  padding: 15px 20px;
  text-align: center;
`;

export default function Toasts(): JSX.Element {
  const toast = useToast();
  const router = useRouter();
  const { isReady: isRouterReady } = router;
  const {
    onSpaceEvent,
    isBroadcasting,
    isScreenShareActive,
    stopScreenShare,
    isLocalScreenShare,
    screenShareParticipantId,
  } = useSpace();
  const screenshareToastRef = useRef<ToastId>();
  const broadcastingToastRef = useRef<ToastId>();
  const participantEventToastIdRefs = useRef<Array<ToastId>>([]);

  const showLocalScreenshareToast = useCallback(() => {
    if (!toast.isActive(ToastIds.SHARING_SCREEN_TOAST_ID)) {
      screenshareToastRef.current = toast({
        ...sharingScreenToastConfig,
        render: ({ onClose }) => {
          return (
            <ToastBox>
              You are sharing your screen.
              <Box
                as="button"
                color="#DF2868"
                onClick={() => {
                  stopScreenShare();
                  onClose();
                }}
                paddingLeft="10px"
              >
                Stop Sharing
              </Box>
            </ToastBox>
          );
        },
      });
    }
  }, [toast, stopScreenShare]);

  const showRemoteScreenshareToast = useCallback(() => {
    if (
      !toast.isActive(ToastIds.VIEWING_SHARED_SCREEN_TOAST_ID) &&
      screenShareParticipantId
    ) {
      const participantName = screenShareParticipantId.split("|")[0];
      screenshareToastRef.current = toast({
        ...viewingSharedScreenToastConfig,
        render: () => (
          <ToastBox>{participantName} is sharing their screen.</ToastBox>
        ),
      });
    }
  }, [toast, screenShareParticipantId]);

  const hideScreenshareToast = useCallback(() => {
    if (screenshareToastRef.current) {
      toast.close(screenshareToastRef.current);
    }
  }, [toast]);

  const showBroadcastToast = useCallback(() => {
    if (!toast.isActive(ToastIds.BROADCASTING_SCREEN_TOAST_ID)) {
      broadcastingToastRef.current = toast({
        ...broadcastingToastConfig,
        render: () => (
          <ToastBox>{"⦿ Space is currently being broadcast"}</ToastBox>
        ),
      });
    }
  }, [toast]);

  const hideBroadcastToast = useCallback(() => {
    if (broadcastingToastRef.current) {
      toast.close(broadcastingToastRef.current);
    }
  }, [toast]);

  const pruneParticipantEventRefs = useCallback(() => {
    // Don't show more than 10 participant event toasts on screen at a time, close the oldest if necessary
    while (participantEventToastIdRefs.current.length > 9) {
      let oldest = participantEventToastIdRefs.current.shift();
      if (oldest) {
        toast.close(oldest);
      }
    }

    // Prune ids of toasts that have already closed on their own
    participantEventToastIdRefs.current =
      participantEventToastIdRefs.current.filter((ref) => toast.isActive(ref));
  }, [participantEventToastIdRefs, toast]);

  const showParticipantEventToast = useCallback(
    (eventDescription: string) => {
      pruneParticipantEventRefs();
      participantEventToastIdRefs.current.push(
        toast({
          ...participantEventToastConfig,
          render: () => <ToastBox>{eventDescription}</ToastBox>,
        })
      );
    },
    [toast, pruneParticipantEventRefs]
  );

  useEffect(() => {
    if (isScreenShareActive) {
      if (isLocalScreenShare) {
        showLocalScreenshareToast();
      } else {
        showRemoteScreenshareToast();
      }
    } else {
      hideScreenshareToast();
    }
  }, [
    isScreenShareActive,
    isLocalScreenShare,
    showLocalScreenshareToast,
    showRemoteScreenshareToast,
    hideScreenshareToast,
  ]);

  useEffect(() => {
    if (isBroadcasting) {
      showBroadcastToast();
    } else {
      hideBroadcastToast();
    }
  }, [isBroadcasting, showBroadcastToast, hideBroadcastToast]);

  useEffect(() => {
    onSpaceEvent(
      SpaceEvent.ParticipantJoined,
      (participant: RemoteParticipant) => {
        let participantName = participant.id.split("|")[0];
        showParticipantEventToast(`${participantName} joined the space`);
      }
    );

    onSpaceEvent(
      SpaceEvent.ParticipantLeft,
      (participant: RemoteParticipant) => {
        let participantName = participant.id.split("|")[0];
        showParticipantEventToast(`${participantName} left the space`);
      }
    );
  }, [onSpaceEvent, showParticipantEventToast]);

  useEffect(() => {
    if (!isRouterReady) return;

    function closeAllToasts() {
      hideBroadcastToast();
      hideScreenshareToast();
      for (let toastRef in participantEventToastIdRefs.current) {
        toast.close(toastRef);
      }
      pruneParticipantEventRefs();
    }

    router.events.on("routeChangeStart", closeAllToasts);
    return () => {
      router.events.off("routeChangeStart", closeAllToasts);
    };
  }, [
    isRouterReady,
    router,
    toast,
    hideBroadcastToast,
    hideScreenshareToast,
    pruneParticipantEventRefs,
  ]);

  return <></>;
}

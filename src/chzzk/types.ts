export interface LiveInfo{
    title: string;
    channelId: string;
    chatChannelId: string;
    viewership: number;
    isLive: boolean;
    category: {
        id: string | null;
        type: string;
        name: string | null;
    }
}
/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils"

interface ProfileLike {
  handle: string
  displayName?: string
  avatar?: string
}

interface Props {
  profile: ProfileLike
  className?: string
}

export function Profile({ profile, className }: Props) {
  return (
    <div className={cn("flex items-center space-x-4", className)}>
      <img
        src={profile.avatar}
        className="h-12 w-12 rounded-full"
        alt={`${profile.handle} avatar`}
      />
      <div className="flex flex-col">
        <p className="text-lg font-semibold leading-5">{profile.displayName}</p>
        <p className="text-sm text-muted-foreground">@{profile.handle}</p>
      </div>
    </div>
  )
}

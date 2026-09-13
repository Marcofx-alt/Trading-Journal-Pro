import { redirect } from 'next/navigation'

export default function RemovedFeatureRedirect() {
  redirect('/reports')
}
